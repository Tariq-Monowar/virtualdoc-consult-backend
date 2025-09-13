import { PartialType } from '@nestjs/swagger';
import { CreateCoachDashboardDto } from './create-coach-dashboard.dto';

export class UpdateCoachDashboardDto extends PartialType(CreateCoachDashboardDto) {}
