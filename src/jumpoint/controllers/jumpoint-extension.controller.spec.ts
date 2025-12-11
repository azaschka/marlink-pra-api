import { QueryBus } from '@nestjs/cqrs';
import { AxiosResponse } from 'axios';
import { Response } from 'express';
import { BusinessUnit } from '../../customer/enums';
import { UuidUtility } from '../../shared/utilities';
import { RetrieveJumpointInstallerByCustomerAndSiteQuery } from '../queries';
import { JumpointExtensionController } from './jumpoint-extension.controller';

describe('JumpointExtensionController', () => {
    let controller: JumpointExtensionController;
    let queryBus: QueryBus;

    beforeEach(() => {
        queryBus = mockQueryBus();
        controller = new JumpointExtensionController(queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpointInstallerByCustomerAndSite', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'content-type': 'application/octet-stream',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'content-disposition': 'attachment; filename=installer.exe',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'content-length': '12345',
                },
                data: {
                    pipe: jest.fn(), // Mocking the pipe method
                } as unknown as NodeJS.ReadableStream,
            } as unknown as AxiosResponse<NodeJS.ReadableStream>;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);
            const res = mockResponse();
            const setHeaderMethod = jest.spyOn(res, 'setHeader');

            await controller.retrieveJumpointInstallerByCustomerAndSite(
                'uuid-100',
                { businessUnits: [BusinessUnit.EG], customerKey: 'cust-1', siteKey: 'site-1' },
                res,
            );

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpointInstallerByCustomerAndSiteQuery('uuid-100', [BusinessUnit.EG], 'cust-1', 'site-1'),
            );
            expect(setHeaderMethod).toHaveBeenCalledWith('Content-Type', expectedResult.headers['content-type']);
            expect(setHeaderMethod).toHaveBeenCalledWith(
                'Content-Disposition',
                expectedResult.headers['content-disposition'],
            );
            expect(setHeaderMethod).toHaveBeenCalledWith('Content-Length', expectedResult.headers['content-length']);
        });
    });
});

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}

function mockResponse(): Response {
    const res: Partial<Response> = {};
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);

    return res as Response;
}
