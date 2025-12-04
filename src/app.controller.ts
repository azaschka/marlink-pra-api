import { Controller, Get, Head, HttpCode, HttpStatus } from '@nestjs/common';

@Controller()
export class AppController {
    @Get('ping')
    public ping(): void {
        return;
    }

    /**
     * Root endpoint for health checks
     * Responds to both GET and HEAD requests
     */
    @Get()
    @Head()
    @HttpCode(200)
    public root(): { status: string; timestamp: string } {
        return {
            status: HttpStatus.OK.toString(),
            timestamp: new Date().toISOString(),
        };
    }
}
