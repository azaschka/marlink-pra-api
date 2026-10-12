import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Syntax-only index of the class declarations in `src/`.
 *
 * Runtime metadata cannot see what TypeScript erases. This index complements it: it maps classes to their
 * source files, lists DTO properties that carry no decorator (accepted by the API but invisible to
 * validation and Swagger), finds handlers with more than one HTTP method decorator (Nest keeps only one),
 * and detects URL composition settings in `src/main.ts`.
 */

const HTTP_METHOD_DECORATORS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options', 'All', 'Search']);

export interface SourceProperty {
    name: string;
    optional: boolean;
    typeText?: string;
    decorators: string[];
}

export interface SourceMethod {
    name: string;
    httpDecorators: string[];
}

export interface SourceClass {
    name: string;
    file: string;
    properties: SourceProperty[];
    methods: SourceMethod[];
    heritage?: string;
}

export interface MainBootstrapFacts {
    /** Active (not commented out) calls in `src/main.ts`. */
    setGlobalPrefixCalls: string[];
    enableVersioningCalls: string[];
    queryParserSettings: string[];
    openApiServers: string[];
}

function decoratorNames(node: ts.Node): string[] {
    const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];

    return decorators.map((decorator) => {
        const expression = decorator.expression;

        if (ts.isCallExpression(expression)) {
            return expression.expression.getText();
        }

        return expression.getText();
    });
}

function listSourceFiles(directory: string): string[] {
    const files: string[] = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...listSourceFiles(fullPath));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }

    return files.sort();
}

export class SourceIndex {
    private readonly classes = new Map<string, SourceClass[]>();

    constructor(
        private readonly repositoryRoot: string,
        sourceDirectory = 'src',
    ) {
        for (const file of listSourceFiles(path.join(repositoryRoot, sourceDirectory))) {
            this.indexFile(file);
        }
    }

    public findClass(name: string): SourceClass | undefined {
        const candidates = this.classes.get(name) ?? [];

        return candidates.length === 1 ? candidates[0] : undefined;
    }

    public isAmbiguous(name: string): boolean {
        return (this.classes.get(name) ?? []).length > 1;
    }

    /** Facts about URL composition and query parsing from the application bootstrap file. */
    public readMainBootstrap(mainFile = 'src/main.ts'): MainBootstrapFacts {
        const fullPath = path.join(this.repositoryRoot, mainFile);
        const sourceFile = ts.createSourceFile(
            fullPath,
            fs.readFileSync(fullPath, 'utf8'),
            ts.ScriptTarget.ES2022,
            true,
        );
        const facts: MainBootstrapFacts = {
            setGlobalPrefixCalls: [],
            enableVersioningCalls: [],
            queryParserSettings: [],
            openApiServers: [],
        };

        const visit = (node: ts.Node): void => {
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
                const method = node.expression.name.text;
                const text = node.getText(sourceFile).replace(/\s+/g, ' ');

                if (method === 'setGlobalPrefix') {
                    facts.setGlobalPrefixCalls.push(text);
                } else if (method === 'enableVersioning') {
                    facts.enableVersioningCalls.push(text);
                } else if (method === 'set' && node.arguments[0]?.getText(sourceFile).includes('query parser')) {
                    facts.queryParserSettings.push(text);
                } else if (method === 'addServer' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
                    facts.openApiServers.push(node.arguments[0].text);
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        return facts;
    }

    public relativePath(file: string): string {
        return path.relative(this.repositoryRoot, file).split(path.sep).join('/');
    }

    private indexFile(file: string): void {
        const sourceFile = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);

        const visit = (node: ts.Node): void => {
            if (ts.isClassDeclaration(node) && node.name) {
                const properties: SourceProperty[] = [];
                const methods: SourceMethod[] = [];

                for (const member of node.members) {
                    if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
                        const isStatic = member.modifiers?.some(
                            (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
                        );

                        if (!isStatic) {
                            properties.push({
                                name: member.name.text,
                                optional: Boolean(member.questionToken),
                                typeText: member.type?.getText(sourceFile),
                                decorators: decoratorNames(member),
                            });
                        }
                    } else if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
                        methods.push({
                            name: member.name.text,
                            httpDecorators: decoratorNames(member).filter((name) => HTTP_METHOD_DECORATORS.has(name)),
                        });
                    }
                }

                const entry: SourceClass = {
                    name: node.name.text,
                    file: this.relativePath(file),
                    properties,
                    methods,
                    heritage: node.heritageClauses?.map((clause) => clause.getText(sourceFile)).join(' '),
                };
                const existing = this.classes.get(entry.name) ?? [];

                existing.push(entry);
                this.classes.set(entry.name, existing);
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
    }
}
