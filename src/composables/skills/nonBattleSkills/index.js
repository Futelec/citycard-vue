import { useGameStore } from '../../../stores/gameStore'
import { createExecuteTransferGold } from './转账给他人'
import { createExecuteWuZhiWuWei } from './无知无畏'
import { createExecuteKuaiSuZhiLiao } from './快速治疗'
import { createExecuteCityProtection } from './城市保护'
import { createExecuteGangTieChengShi } from './钢铁城市'
import { createExecuteShiLiZengQiang } from './实力增强'
import { createExecuteJieShiHuanHun } from './借尸还魂'
import { createExecuteShiQiDaZhen } from './士气大振'
import { createExecuteQingChuJiaCheng } from './清除加成'
import { createExecuteShiLaiYunZhuan } from './时来运转'
import { createExecuteFortuneSwap } from './时来运转·交换执行'
import { createExecuteXianShengDuoRen } from './先声夺人'
import { createAcceptPreemptiveStrike } from './先声夺人·接受'
import { createRejectPreemptiveStrike } from './先声夺人·拒绝'
import { createExecuteJinBiDaiKuan } from './金币贷款'
import { createExecuteDingHaiShenZhen } from './定海神针'
import { createExecuteHuanRanYiXin } from './焕然一新'
import { createExecuteGouYanCanChuan } from './苟延残喘'
import { createExecuteGaoJiZhiLiao } from './高级治疗'
import { createExecuteZhongZhiChengCheng } from './众志成城'
import { createExecuteWuZhongShengYou } from './无中生有'
import { createExecuteHaoGaoWuYuan } from './点石成金'
import { createExecuteHuJiaHuWei } from './狐假虎威'
import { createExecutePaoZhuanYinYu } from './抛砖引玉'
import { createExecuteJinZhiNiuQu } from './进制扭曲'
import { createExecuteYiLuoQianZhang } from './一落千丈'
import { createExecuteLianXuDaJi } from './连续打击'
import { createExecuteBoTaoXiongYong } from './波涛汹涌'
import { createExecuteKuangHongLanZha } from './狂轰滥炸'
import { createExecuteHengSaoYiKong } from './横扫一空'
import { createExecuteWanJianQiFa } from './万箭齐发'
import { createExecuteJiangWeiDaJi } from './降维打击'
import { createExecuteShenCangBuLu } from './深藏不露'
import { createExecuteDingShiBaoPo } from './定时爆破'
import { createExecuteYongJiuCuiHui } from './永久摧毁'
import { createExecuteZhanLueZhuanYi } from './战略转移'
import { createExecuteGaiXianGengZhang } from './改弦更张'
import { createExecuteLianSuoFanYing } from './连锁反应'
import { createExecuteZhaoXianNaShi } from './招贤纳士'
import { createExecuteJianBuKeCui } from './坚不可摧'
import { createExecuteYiHuaJieMu } from './移花接木'
import { createExecuteBuLuZongJi } from './不露踪迹'
import { createExecuteRenZhiJiaoHuan } from './人质交换'
import { createExecuteHostageSwap } from './人质交换·执行'
import { createExecuteFuDiChouXin } from './釜底抽薪'
import { createExecuteJinRongWeiJi } from './金融危机'
import { createExecuteJieFuJiPin } from './劫富济贫'
import { createExecuteChengShiShiLian } from './城市试炼'
import { createExecuteTianZaiRenHuo } from './天灾人祸'
import { createExecuteLiDaiTaoJiang } from './李代桃僵'
import { createExecuteBiErBuJian } from './避而不见'
import { createExecuteYiChuJiFa } from './一触即发'
import { createExecuteJiNengBaoHu } from './技能保护'
import { createExecuteTuPoPingJing } from './突破瓶颈'
import { createExecuteXueLiangCunChu } from './血量存储'
import { createExecuteHaiShiShenLou } from './海市蜃楼'
import { createExecuteJieChuFengSuo } from './解除封锁'
import { createExecuteShuWeiFanZhuan } from './数位反转'
import { createExecuteChunBuNanXing } from './寸步难行'
import { createExecuteGuoHeChaiQiao } from './过河拆桥'
import { createExecuteDianCiGanYing } from './电磁感应'
import { createExecuteHouJiBaoFa } from './厚积薄发'
import { createExecuteZhongYongZhiDao } from './中庸之道'
import { createExecuteDangJiLiDuan } from './当机立断'
import { createExecuteYanTingJiCong } from './言听计从'
import { createExecuteShiBanGongBei } from './事半功倍'
import { createExecuteDaoFanTianGang } from './倒反天罡'
import { createExecuteBanyunJiubingPutong } from './搬运救兵'
import { createExecuteChenqibubeiSuiji } from './趁其不备'
import { createExecuteBaQiYiZhi } from './拔旗易帜'
import { createExecuteShouWangXiangZhu } from './守望相助'
import { createExecuteYiLiLaiJiang } from './以礼来降'
import { createExecuteDaYiMieQin } from './大义灭亲'
import { createExecuteQiangZhiQianDuPutong } from './强制转移·普通'
import { createExecuteQiangZhiQianDuGaoji } from './强制转移·高级'
import { createExecuteYiWeiPingDi } from './夷为平地'
import { createExecuteXingZhengZhongXin } from './行政中心'
import { createExecuteDaiXingShengQuan } from './代行省权'
import { createExecuteFuZhongXinZhi } from './副中心制'
import { createExecuteJiHuaDanLie } from './计划单列'
import { createExecuteBuBuGaoSheng } from './步步高升'
import { createExecuteShengYuZiShi } from './生于紫室'
import { createExecuteQiangZhiBanYun } from './强制搬运'
import { createExecuteZiXiangCanSha } from './自相残杀'
import { createExecuteCityDetective } from './城市侦探'
import { createExecuteCityProphecy } from './城市预言'
import { createExecuteYiJuLiangDe } from './一举两得'
import { createExecuteMingChaQiuHao } from './明察秋毫'
import { createExecuteSiMianChuGe } from './四面楚歌'
import { createExecuteBoXueDuoCai } from './博学多才'

/**
 * nonBattleSkills 统一入口：逐个创建单技能实现并返回与原实现完全一致的 API
 */
export function useNonBattleSkills() {
  const gameStore = useGameStore()

  const executeTransferGold = createExecuteTransferGold(gameStore)
  const executeWuZhiWuWei = createExecuteWuZhiWuWei(gameStore)
  const executeKuaiSuZhiLiao = createExecuteKuaiSuZhiLiao(gameStore)
  const executeCityProtection = createExecuteCityProtection(gameStore)
  const executeGangTieChengShi = createExecuteGangTieChengShi(gameStore)
  const executeShiLiZengQiang = createExecuteShiLiZengQiang(gameStore)
  const executeJieShiHuanHun = createExecuteJieShiHuanHun(gameStore)
  const executeShiQiDaZhen = createExecuteShiQiDaZhen(gameStore)
  const executeQingChuJiaCheng = createExecuteQingChuJiaCheng(gameStore)
  const executeShiLaiYunZhuan = createExecuteShiLaiYunZhuan(gameStore)
  const executeFortuneSwap = createExecuteFortuneSwap(gameStore)
  const executeXianShengDuoRen = createExecuteXianShengDuoRen(gameStore)
  const acceptPreemptiveStrike = createAcceptPreemptiveStrike(gameStore)
  const rejectPreemptiveStrike = createRejectPreemptiveStrike(gameStore)
  const executeJinBiDaiKuan = createExecuteJinBiDaiKuan(gameStore)
  const executeDingHaiShenZhen = createExecuteDingHaiShenZhen(gameStore)
  const executeHuanRanYiXin = createExecuteHuanRanYiXin(gameStore)
  const executeGouYanCanChuan = createExecuteGouYanCanChuan(gameStore)
  const executeGaoJiZhiLiao = createExecuteGaoJiZhiLiao(gameStore)
  const executeZhongZhiChengCheng = createExecuteZhongZhiChengCheng(gameStore)
  const executeWuZhongShengYou = createExecuteWuZhongShengYou(gameStore)
  const executeHaoGaoWuYuan = createExecuteHaoGaoWuYuan(gameStore)
  const executeHuJiaHuWei = createExecuteHuJiaHuWei(gameStore)
  const executePaoZhuanYinYu = createExecutePaoZhuanYinYu(gameStore)
  const executeJinZhiNiuQu = createExecuteJinZhiNiuQu(gameStore)
  const executeYiLuoQianZhang = createExecuteYiLuoQianZhang(gameStore)
  const executeLianXuDaJi = createExecuteLianXuDaJi(gameStore)
  const executeBoTaoXiongYong = createExecuteBoTaoXiongYong(gameStore)
  const executeKuangHongLanZha = createExecuteKuangHongLanZha(gameStore)
  const executeHengSaoYiKong = createExecuteHengSaoYiKong(gameStore)
  const executeWanJianQiFa = createExecuteWanJianQiFa(gameStore)
  const executeJiangWeiDaJi = createExecuteJiangWeiDaJi(gameStore)
  const executeShenCangBuLu = createExecuteShenCangBuLu(gameStore)
  const executeDingShiBaoPo = createExecuteDingShiBaoPo(gameStore)
  const executeYongJiuCuiHui = createExecuteYongJiuCuiHui(gameStore)
  const executeZhanLueZhuanYi = createExecuteZhanLueZhuanYi(gameStore)
  const executeGaiXianGengZhang = createExecuteGaiXianGengZhang(gameStore)
  const executeLianSuoFanYing = createExecuteLianSuoFanYing(gameStore)
  const executeZhaoXianNaShi = createExecuteZhaoXianNaShi(gameStore)
  const executeJianBuKeCui = createExecuteJianBuKeCui(gameStore)
  const executeYiHuaJieMu = createExecuteYiHuaJieMu(gameStore)
  const executeBuLuZongJi = createExecuteBuLuZongJi(gameStore)
  const executeRenZhiJiaoHuan = createExecuteRenZhiJiaoHuan(gameStore)
  const executeHostageSwap = createExecuteHostageSwap(gameStore)
  const executeFuDiChouXin = createExecuteFuDiChouXin(gameStore)
  const executeJinRongWeiJi = createExecuteJinRongWeiJi(gameStore)
  const executeJieFuJiPin = createExecuteJieFuJiPin(gameStore)
  const executeChengShiShiLian = createExecuteChengShiShiLian(gameStore)
  const executeTianZaiRenHuo = createExecuteTianZaiRenHuo(gameStore)
  const executeLiDaiTaoJiang = createExecuteLiDaiTaoJiang(gameStore)
  const executeBiErBuJian = createExecuteBiErBuJian(gameStore)
  const executeYiChuJiFa = createExecuteYiChuJiFa(gameStore)
  const executeJiNengBaoHu = createExecuteJiNengBaoHu(gameStore)
  const executeTuPoPingJing = createExecuteTuPoPingJing(gameStore)
  const executeXueLiangCunChu = createExecuteXueLiangCunChu(gameStore)
  const executeHaiShiShenLou = createExecuteHaiShiShenLou(gameStore)
  const executeJieChuFengSuo = createExecuteJieChuFengSuo(gameStore)
  const executeShuWeiFanZhuan = createExecuteShuWeiFanZhuan(gameStore)
  const executeChunBuNanXing = createExecuteChunBuNanXing(gameStore)
  const executeGuoHeChaiQiao = createExecuteGuoHeChaiQiao(gameStore)
  const executeDianCiGanYing = createExecuteDianCiGanYing(gameStore)
  const executeHouJiBaoFa = createExecuteHouJiBaoFa(gameStore)
  const executeZhongYongZhiDao = createExecuteZhongYongZhiDao(gameStore)
  const executeDangJiLiDuan = createExecuteDangJiLiDuan(gameStore)
  const executeYanTingJiCong = createExecuteYanTingJiCong(gameStore)
  const executeShiBanGongBei = createExecuteShiBanGongBei(gameStore)
  const executeDaoFanTianGang = createExecuteDaoFanTianGang(gameStore)
  const executeBanyunJiubingPutong = createExecuteBanyunJiubingPutong(gameStore)
  const executeChenqibubeiSuiji = createExecuteChenqibubeiSuiji(gameStore)
  const executeBaQiYiZhi = createExecuteBaQiYiZhi(gameStore)
  const executeShouWangXiangZhu = createExecuteShouWangXiangZhu(gameStore)
  const executeYiLiLaiJiang = createExecuteYiLiLaiJiang(gameStore)
  const executeDaYiMieQin = createExecuteDaYiMieQin(gameStore)
  const executeQiangZhiQianDuPutong = createExecuteQiangZhiQianDuPutong(gameStore)
  const executeQiangZhiQianDuGaoji = createExecuteQiangZhiQianDuGaoji(gameStore)
  const executeYiWeiPingDi = createExecuteYiWeiPingDi(gameStore)
  const executeXingZhengZhongXin = createExecuteXingZhengZhongXin(gameStore)
  const executeDaiXingShengQuan = createExecuteDaiXingShengQuan(gameStore)
  const executeFuZhongXinZhi = createExecuteFuZhongXinZhi(gameStore)
  const executeJiHuaDanLie = createExecuteJiHuaDanLie(gameStore)
  const executeBuBuGaoSheng = createExecuteBuBuGaoSheng(gameStore)
  const executeShengYuZiShi = createExecuteShengYuZiShi(gameStore)
  const executeQiangZhiBanYun = createExecuteQiangZhiBanYun(gameStore)
  const executeZiXiangCanSha = createExecuteZiXiangCanSha(gameStore)
  const executeCityDetective = createExecuteCityDetective(gameStore)
  const executeCityProphecy = createExecuteCityProphecy(gameStore)
  const executeYiJuLiangDe = createExecuteYiJuLiangDe(gameStore)
  const executeMingChaQiuHao = createExecuteMingChaQiuHao(gameStore)
  const executeSiMianChuGe = createExecuteSiMianChuGe(gameStore)
  const executeBoXueDuoCai = createExecuteBoXueDuoCai(gameStore)

  return {
    executeTransferGold,
    executeWuZhiWuWei,
    executeKuaiSuZhiLiao,
    executeCityProtection,
    executeGangTieChengShi,
    executeShiLiZengQiang,
    executeJieShiHuanHun,
    executeShiQiDaZhen,
    executeQingChuJiaCheng,
    executeShiLaiYunZhuan,
    executeFortuneSwap,
    executeXianShengDuoRen,
    acceptPreemptiveStrike,
    rejectPreemptiveStrike,
    executeJinBiDaiKuan,
    executeDingHaiShenZhen,
    executeHuanRanYiXin,
    executeGouYanCanChuan,
    executeGaoJiZhiLiao,
    executeZhongZhiChengCheng,
    executeWuZhongShengYou,
    executeHaoGaoWuYuan,
    executeHuJiaHuWei,
    executePaoZhuanYinYu,
    executeJinZhiNiuQu,
    executeYiLuoQianZhang,
    executeLianXuDaJi,
    executeBoTaoXiongYong,
    executeKuangHongLanZha,
    executeHengSaoYiKong,
    executeWanJianQiFa,
    executeJiangWeiDaJi,
    executeShenCangBuLu,
    executeDingShiBaoPo,
    executeYongJiuCuiHui,
    executeZhanLueZhuanYi,
    executeGaiXianGengZhang,
    executeLianSuoFanYing,
    executeZhaoXianNaShi,
    executeJianBuKeCui,
    executeYiHuaJieMu,
    executeBuLuZongJi,
    executeRenZhiJiaoHuan,
    executeHostageSwap,
    executeFuDiChouXin,
    executeJinRongWeiJi,
    executeJieFuJiPin,
    executeChengShiShiLian,
    executeTianZaiRenHuo,
    executeLiDaiTaoJiang,
    executeBiErBuJian,
    executeYiChuJiFa,
    executeJiNengBaoHu,
    executeTuPoPingJing,
    executeXueLiangCunChu,
    executeHaiShiShenLou,
    executeJieChuFengSuo,
    executeShuWeiFanZhuan,
    executeChunBuNanXing,
    executeGuoHeChaiQiao,
    executeDianCiGanYing,
    executeHouJiBaoFa,
    executeZhongYongZhiDao,
    executeDangJiLiDuan,
    executeZiXiangCanSha,
    executeYanTingJiCong,
    executeShiBanGongBei,
    executeDaoFanTianGang,
    executeBanyunJiubingPutong,
    executeChenqibubeiSuiji,
    executeBaQiYiZhi,
    executeShouWangXiangZhu,
    executeYiLiLaiJiang,
    executeDaYiMieQin,
    executeQiangZhiQianDuPutong,
    executeQiangZhiQianDuGaoji,
    executeYiWeiPingDi,
    executeQiangZhiBanYun,
    executeXingZhengZhongXin,
    executeDaiXingShengQuan,
    executeFuZhongXinZhi,
    executeJiHuaDanLie,
    executeBuBuGaoSheng,
    executeShengYuZiShi,
    executeCityDetective,
    executeCityProphecy,
    executeYiJuLiangDe,
    executeMingChaQiuHao,
    executeSiMianChuGe,
    executeBoXueDuoCai
  }
}
