import { Body, Controller, Get, Header, Param, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth';
import { BreakCompletedDto, RewardDesignDto } from './dto';
import { RewardsService } from './rewards';
import { cardData, createRewardPdf } from './reward-documents';
@Controller('api/rewards') @UseGuards(AuthGuard)
export class RewardsController {
  constructor(private rewards:RewardsService){}
  @Get() summary(@Req() req:any){return this.rewards.summary(req.user);}
  @Post('breaks') confirm(@Req() req:any,@Body() body:BreakCompletedDto){return this.rewards.confirmBreak(req.user,body.slot);}
  @Get('card') @Header('Cache-Control','no-store')
  async card(@Req() req:any,@Query() design:RewardDesignDto){await this.rewards.requireReward(req.user,'card');return cardData(req.user,design);}
  @Get(':id/pdf') @Header('Cache-Control','no-store')
  async pdf(@Req() req:any,@Param('id') id:string,@Query() design:RewardDesignDto){
    await this.rewards.requireReward(req.user,id);
    return new StreamableFile(await createRewardPdf(id,req.user,design),{type:'application/pdf',disposition:`attachment; filename="h3o-${id}.pdf"`});
  }
}
