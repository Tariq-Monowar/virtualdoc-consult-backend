import { Test, TestingModule } from '@nestjs/testing';
import { CoachDashboardController } from './coach-dashboard.controller';
import { CoachDashboardService } from './coach-dashboard.service';

describe('CoachDashboardController', () => {
  let controller: CoachDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoachDashboardController],
      providers: [CoachDashboardService],
    }).compile();

    controller = module.get<CoachDashboardController>(CoachDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
