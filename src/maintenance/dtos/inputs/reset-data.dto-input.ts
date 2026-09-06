import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ResetDataDtoInput {
    /**
     * When true, the endpoint performs a dry-run: it only returns the list of
     * tables that would be truncated (and how many backup files would be
     * deleted) without changing anything.
     */
    @IsOptional()
    @IsBoolean()
    public dryRun?: boolean;

    /**
     * Confirmation phrase that must equal the expected value before any
     * destructive operation is executed. Ignored when `dryRun` is true.
     */
    @IsOptional()
    @IsString()
    public confirm?: string;
}
