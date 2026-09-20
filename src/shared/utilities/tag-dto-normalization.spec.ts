import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
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
import { CreateJumpClientInstallerDtoInput } from '../../jump-client/dtos/inputs/create-jump-client-installer.dto-input';
import { ModifyJumpClientDtoInput } from '../../jump-client/dtos/inputs/modify-jump-client.dto-input';

/**
 * Regression guard for MARLINKPRA-56: every DTO that accepts an asset tag must normalize it to the canonical
 * UPPERCASE form, so that ingestion, manual creation, edit and direct API calls all produce the same value.
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

describe('Asset tag normalization on input DTOs', () => {
    describe.each(TAG_DTOS)('%s', (_name, dtoClass) => {
        it('should normalize the tag to the canonical UPPERCASE form', () => {
            const dto = plainToInstance(dtoClass, { tag: 'acme site-01' });
            expect(dto.tag).toBe('ACME_SITE_01');
        });

        it('should leave an already canonical tag unchanged', () => {
            const dto = plainToInstance(dtoClass, { tag: 'ACME_SITE_01' });
            expect(dto.tag).toBe('ACME_SITE_01');
        });

        it('should keep the tag undefined when it is not provided', () => {
            const dto = plainToInstance(dtoClass, {});
            expect(dto.tag).toBeUndefined();
        });
    });

    it('should normalize the tag through the ValidationPipe used by the controllers', async () => {
        const pipe = new ValidationPipe({ transform: true });
        const metadata: ArgumentMetadata = { type: 'body', metatype: ModifyShellJumpDtoInput };

        const result = (await pipe.transform({ tag: 'acme site' }, metadata)) as ModifyShellJumpDtoInput;

        expect(result.tag).toBe('ACME_SITE');
    });

    it('should still reject a non-string tag', async () => {
        const pipe = new ValidationPipe({ transform: true });
        const metadata: ArgumentMetadata = { type: 'body', metatype: ModifyShellJumpDtoInput };

        await expect(pipe.transform({ tag: 42 }, metadata)).rejects.toBeDefined();
    });
});
