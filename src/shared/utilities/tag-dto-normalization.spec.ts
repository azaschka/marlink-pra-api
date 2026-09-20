import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { CreateJumpClientInstallerDtoInput } from '../../jump-client/dtos/inputs/create-jump-client-installer.dto-input';
import { ModifyJumpClientDtoInput } from '../../jump-client/dtos/inputs/modify-jump-client.dto-input';
import { CreateProtocolTunnelJumpDtoInput } from '../../jump-item/protocol-tunnel-jump/dtos/inputs/create-protocol-tunnel-jump.dto-input';
import { ModifyProtocolTunnelJumpDtoInput } from '../../jump-item/protocol-tunnel-jump/dtos/inputs/modify-protocol-tunnel-jump.dto-input';
import { CreateRemoteRdpDtoInput } from '../../jump-item/remote-rdp/dtos/inputs/create-remote-rdp.dto-input';
import { ModifyRemoteRdpDtoInput } from '../../jump-item/remote-rdp/dtos/inputs/modify-remote-rdp.dto-input';
import { CreateRemoteVncDtoInput } from '../../jump-item/remote-vnc/dtos/inputs/create-remote-vnc.dto-input';
import { ModifyRemoteVncDtoInput } from '../../jump-item/remote-vnc/dtos/inputs/modify-remote-vnc.dto-input';
import { CreateShellJumpDtoInput } from '../../jump-item/shell-jump/dtos/inputs/create-shell-jump.dto-input';
import { ModifyShellJumpDtoInput } from '../../jump-item/shell-jump/dtos/inputs/modify-shell-jump.dto-input';
import { CreateWebJumpDtoInput } from '../../jump-item/web-jump/dtos/inputs/create-web-jump.dto-input';
import { ModifyWebJumpDtoInput } from '../../jump-item/web-jump/dtos/inputs/modify-web-jump.dto-input';

/**
 * Regression guard for MARLINKPRA-56 and MARLINKPRA-71.
 * Every DTO that accepts an asset tag (create and modify) must
 * - normalize the tag to the canonical UPPERCASE form (MARLINKPRA-56), and
 * - reject a tag that is empty after normalization (MARLINKPRA-71).
 * Create requests additionally require the tag, modify (PATCH) requests may omit it to leave it unchanged.
 * All rules come from the shared `@AssetTag()` decorator.
 */
const TAG_DTOS: Array<[string, new () => { tag?: string }]> = [
    ['CreateShellJumpDtoInput', CreateShellJumpDtoInput],
    ['ModifyShellJumpDtoInput', ModifyShellJumpDtoInput],
    ['CreateWebJumpDtoInput', CreateWebJumpDtoInput],
    ['ModifyWebJumpDtoInput', ModifyWebJumpDtoInput],
    ['CreateRemoteRdpDtoInput', CreateRemoteRdpDtoInput],
    ['ModifyRemoteRdpDtoInput', ModifyRemoteRdpDtoInput],
    ['CreateRemoteVncDtoInput', CreateRemoteVncDtoInput],
    ['ModifyRemoteVncDtoInput', ModifyRemoteVncDtoInput],
    ['CreateProtocolTunnelJumpDtoInput', CreateProtocolTunnelJumpDtoInput],
    ['ModifyProtocolTunnelJumpDtoInput', ModifyProtocolTunnelJumpDtoInput],
    ['CreateJumpClientInstallerDtoInput', CreateJumpClientInstallerDtoInput],
    ['ModifyJumpClientDtoInput', ModifyJumpClientDtoInput],
];

const CREATE_DTOS = TAG_DTOS.filter(([name]) => name.startsWith('Create'));
const MODIFY_DTOS = TAG_DTOS.filter(([name]) => name.startsWith('Modify'));

/** Validation errors reported for the tag property only, so the other required fields of a DTO do not interfere. */
function tagErrors(dtoClass: new () => { tag?: string }, payload: Record<string, unknown>) {
    const dto = plainToInstance(dtoClass, payload);
    return validateSync(dto as object).filter((error) => error.property === 'tag');
}

function collectFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = join(directory, entry.name);
        return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
    });
}

describe('Asset tag on input DTOs', () => {
    describe.each(TAG_DTOS)('%s', (_name, dtoClass) => {
        it('should normalize the tag to the canonical UPPERCASE form', () => {
            const dto = plainToInstance(dtoClass, { tag: 'acme site-01' });
            expect(dto.tag).toBe('ACME_SITE_01');
        });

        it('should leave an already canonical tag unchanged', () => {
            const dto = plainToInstance(dtoClass, { tag: 'ACME_SITE_01' });
            expect(dto.tag).toBe('ACME_SITE_01');
        });

        it('should accept a valid tag', () => {
            expect(tagErrors(dtoClass, { tag: 'acme site-01' })).toHaveLength(0);
        });

        it.each([
            ['null', { tag: null }],
            ['an empty string', { tag: '' }],
            ['whitespace only', { tag: '   ' }],
            ['special characters only', { tag: '###' }],
            ['a number', { tag: 42 }],
        ])('should reject a tag that is %s', (_case, payload) => {
            expect(tagErrors(dtoClass, payload)).not.toHaveLength(0);
        });
    });

    describe.each(CREATE_DTOS)('%s (create)', (_name, dtoClass) => {
        it('should reject a missing tag', () => {
            expect(tagErrors(dtoClass, {})).not.toHaveLength(0);
        });
    });

    describe.each(MODIFY_DTOS)('%s (modify)', (_name, dtoClass) => {
        it('should accept an omitted tag, which leaves the existing tag unchanged', () => {
            expect(tagErrors(dtoClass, {})).toHaveLength(0);
        });
    });

    it('should normalize the tag through the ValidationPipe used by the controllers', async () => {
        const pipe = new ValidationPipe({ transform: true });
        const metadata: ArgumentMetadata = { type: 'body', metatype: ModifyShellJumpDtoInput };

        const result = (await pipe.transform({ tag: 'acme site' }, metadata)) as ModifyShellJumpDtoInput;

        expect(result.tag).toBe('ACME_SITE');
    });

    it('should accept a partial modify request without a tag through the ValidationPipe', async () => {
        const pipe = new ValidationPipe({ transform: true });
        const metadata: ArgumentMetadata = { type: 'body', metatype: ModifyShellJumpDtoInput };

        await expect(pipe.transform({ name: 'renamed' }, metadata)).resolves.toBeDefined();
    });

    it('should reject a modify request that blanks the tag through the ValidationPipe', async () => {
        const pipe = new ValidationPipe({ transform: true });
        const metadata: ArgumentMetadata = { type: 'body', metatype: ModifyShellJumpDtoInput };

        await expect(pipe.transform({ tag: null }, metadata)).rejects.toBeDefined();
        await expect(pipe.transform({ tag: '  ' }, metadata)).rejects.toBeDefined();
    });

    it('should reject a create request without a tag through the ValidationPipe', async () => {
        const pipe = new ValidationPipe({ transform: true });
        const metadata: ArgumentMetadata = { type: 'body', metatype: CreateShellJumpDtoInput };

        await expect(pipe.transform({ name: 'asset' }, metadata)).rejects.toBeDefined();
    });

    it('should use @AssetTag() on every create and modify input DTO that carries a tag', () => {
        const srcRoot = join(__dirname, '..', '..');
        const tagDtoFiles = collectFiles(srcRoot).filter((file) => {
            if (!/[\\/]dtos[\\/]inputs[\\/](create|modify)-.*\.dto-input\.ts$/.test(file)) return false;
            return /public tag[?!]?:/.test(readFileSync(file, 'utf8'));
        });

        expect(tagDtoFiles.length).toBe(TAG_DTOS.length);
        const withoutDecorator = tagDtoFiles.filter((file) => !readFileSync(file, 'utf8').includes('@AssetTag('));
        expect(withoutDecorator).toEqual([]);

        // Modify DTOs must stay optional, create DTOs must stay mandatory.
        const misconfigured = tagDtoFiles.filter((file) => {
            const isModify = /modify-[^\\/]*$/.test(file);
            const declaresOptional = /@AssetTag\(\{[^}]*required:\s*false/.test(readFileSync(file, 'utf8'));
            return isModify !== declaresOptional;
        });
        expect(misconfigured).toEqual([]);
    });
});
