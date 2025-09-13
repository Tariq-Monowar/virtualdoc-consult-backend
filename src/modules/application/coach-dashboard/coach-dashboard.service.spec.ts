import { Test, TestingModule } from '@nestjs/testing';
import { CoachDashboardService } from './coach-dashboard.service';

describe('CoachDashboardService', () => {
  let service: CoachDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoachDashboardService],
    }).compile();

    service = module.get<CoachDashboardService>(CoachDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
