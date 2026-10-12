/* eslint-disable @typescript-eslint/naming-convention -- object keys are HTTP routes, DTO paths and file paths */
import {
    Body,
    CanActivate,
    Controller,
    Delete,
    forwardRef,
    Get,
    Head,
    HttpCode,
    HttpStatus,
    Injectable,
    Module,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController, ApiExcludeEndpoint, ApiParam, ApiProperty, PartialType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { TenantIdHeader, TransactionIdHeader } from '../../../src/core/decorators';
import { NonEmptyBodyPipe } from '../../../src/shared/pipes';
import { COLLECTION_CONFIG } from '../config/collection.config';
import { ComponentRule } from '../config/components.config';

/**
 * A small Nest module graph with the patterns the generator must handle: Swagger-excluded controllers,
 * inherited routes, route arrays, dynamic and forward-referenced modules, an unregistered controller,
 * custom header decorators, guard combinations, nested, inherited and mapped DTOs.
 */

export enum Colour {
    Red = 'red',
    Blue = 'blue',
}

export class FixtureAccessGuard implements CanActivate {
    public canActivate(): boolean {
        return true;
    }
}

export class FixtureApiKeyGuard implements CanActivate {
    public canActivate(): boolean {
        return true;
    }
}

export class FixtureJwtGuard implements CanActivate {
    public canActivate(): boolean {
        return true;
    }
}

@Injectable()
export class FixtureScopeInterceptor {
    public intercept(): void {
        return;
    }
}

export class AddressDtoInput {
    @ApiProperty({ description: 'Street.' })
    @IsString()
    @IsNotEmpty()
    public street!: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    public number?: number;
}

export class BaseThingDtoInput {
    @ApiProperty({ description: 'Name of the thing.' })
    @IsString()
    @MaxLength(20)
    public name!: string;
}

export class CreateThingDtoInput extends BaseThingDtoInput {
    @ApiProperty({ enum: Colour, required: true })
    @IsEnum(Colour)
    public colour: Colour = Colour.Blue;

    @ApiProperty({ type: [AddressDtoInput] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => AddressDtoInput)
    public addresses!: AddressDtoInput[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEmail()
    public contactEmail?: string;

    @ApiProperty({ required: false })
    @ValidateIf((value: CreateThingDtoInput) => value.contactEmail !== undefined)
    @IsBoolean()
    public notify?: boolean;

    // Declared without decorators: accepted by the API but invisible to validation and Swagger.
    public comment?: string;
}

export class ModifyThingDtoInput extends PartialType(CreateThingDtoInput) {}

export class RetrieveThingsDtoInput {
    @ApiProperty({ required: false, default: 50 })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageSize: number = 50;

    @Expose({ name: 'owner_name' })
    @IsString()
    @IsNotEmpty()
    public ownerName!: string;

    @IsOptional()
    @IsString({ each: true })
    public tags?: string[];
}

export abstract class BaseReadController {
    @Get('shared')
    public shared(): string {
        return 'inherited';
    }
}

@Controller('things')
@UseGuards(FixtureAccessGuard)
@UseInterceptors(FixtureScopeInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
export class ThingController extends BaseReadController {
    @Get()
    public retrieveThings(
        @TransactionIdHeader() transactionId: string,
        @TenantIdHeader() tenantId: number,
        @Query() query: RetrieveThingsDtoInput,
    ): string {
        return `${transactionId}:${tenantId}:${query.ownerName}`;
    }

    @Post()
    public createThing(@Body() body: CreateThingDtoInput): string {
        return body.name;
    }

    @Patch(':id')
    @ApiParam({ name: 'id', type: Number, description: 'Thing id.' })
    public modifyThing(@Param('id') id: number, @Body(new NonEmptyBodyPipe()) body: ModifyThingDtoInput): string {
        return `${id}:${body.name ?? ''}`;
    }

    @Delete([':id', 'by-name/:name'])
    @HttpCode(HttpStatus.NO_CONTENT)
    public deleteThing(@Param('id') id: number): number {
        return id;
    }
}

@Controller('internal-things')
@UseGuards(FixtureApiKeyGuard, FixtureJwtGuard)
@ApiExcludeController()
export class InternalThingController {
    @Get('profile')
    public profile(@Req() request: { user?: string }): string {
        return request.user ?? 'me';
    }
}

@Controller('public')
export class PublicController {
    @Get()
    @Head()
    public root(): string {
        return 'ok';
    }

    @Get('hidden')
    @ApiExcludeEndpoint()
    @UseGuards(FixtureApiKeyGuard)
    public hidden(): string {
        return 'hidden';
    }
}

@Controller('never-registered')
export class UnregisteredController {
    @Get()
    public unreachable(): string {
        return 'never';
    }
}

@Module({ controllers: [InternalThingController] })
export class InternalModule {}

@Module({})
export class DynamicHostModule {
    public static register(): { module: typeof DynamicHostModule; controllers: Array<typeof PublicController> } {
        return { module: DynamicHostModule, controllers: [PublicController] };
    }
}

@Module({ imports: [forwardRef(() => InternalModule)], controllers: [ThingController] })
export class ThingModule {}

@Module({
    imports: [ThingModule, DynamicHostModule.register(), Promise.resolve({ module: class EmptyAsyncModule {} })],
})
export class FixtureAppModule {}

export const FIXTURE_GUARD_RULES: Record<string, ComponentRule> = {
    FixtureAccessGuard: { role: 'authentication', authScheme: 'accessKey' },
    FixtureApiKeyGuard: { role: 'authentication', authScheme: 'apiKey' },
    FixtureJwtGuard: { role: 'authentication', authScheme: 'jwt' },
};

export const FIXTURE_INTERCEPTOR_RULES: Record<string, ComponentRule> = {
    FixtureScopeInterceptor: {
        role: 'scope',
        readsHeaders: [
            { name: 'X-Tenant-Id', required: false, type: 'integer', description: 'Optional tenant filter.' },
        ],
        note: 'Scope note.',
    },
};

export const FIXTURE_PIPE_RULES: Record<string, ComponentRule> = {
    ValidationPipe: { role: 'validation' },
    NonEmptyBodyPipe: { role: 'non-empty-body' },
};

export const FIXTURE_CONFIG: typeof COLLECTION_CONFIG = {
    ...COLLECTION_CONFIG,
    domains: [
        { name: 'Things', description: 'Things.', controllers: ['ThingController'] },
        { name: 'Public', description: 'Public.', controllers: ['PublicController'] },
        { name: 'Internal', description: 'Internal.', controllers: ['InternalThingController'] },
    ],
    controllersWithoutRoutes: {},
    pathVariableNames: {},
    requestObjectUsages: { 'GET /internal-things/profile': 'Reads request.user.' },
    downloadResponses: {},
    passthroughResponses: {},
};
