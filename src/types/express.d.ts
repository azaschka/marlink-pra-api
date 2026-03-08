import { Access } from '../access/models';
import { BusinessUnit } from '../beyondtrust-instance/enums';
import { Customer } from '../customer/models';
import { JumpGroup } from '../jump-group/models';

declare global {
    namespace Express {
        // Extend AuthInfo to include our access property
        interface AuthInfo {
            access: Access;
        }

        // Add custom properties to Request
        interface Request {
            businessUnits?: BusinessUnit[];
            customers?: Customer[];
            jumpGroups?: JumpGroup[];
        }
    }
}
