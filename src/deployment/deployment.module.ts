import { Module } from '@nestjs/common';
import { JumpointNodeModule } from './jumpoint-node/jumpoint-node.module';

@Module({
    imports: [JumpointNodeModule],
})
export class DeploymentModule {}
