import { useGameStore } from '../../../stores/gameStore'
import { createExecuteQinZeiQinWang } from './擒贼擒王'
import { createExecuteCaoMuJieBing } from './草木皆兵'
import { createExecuteYueZhanYueYong } from './越战越勇'
import { createExecuteXiYinGongJi } from './吸引攻击'
import { createExecuteTongQiangTieBi } from './铜墙铁壁'
import { createExecuteBeiShuiYiZhan } from './背水一战'
import { createExecuteLiaoShiRuShen } from './料事如神'
import { createExecuteTongGuiYuJin } from './同归于尽'
import { createExecuteSetBarrier } from './设置屏障'
import { createExecuteQianNengJiFa } from './潜能激发'
import { createExecuteYuJiaQinZheng } from './御驾亲征'
import { createExecuteKuangBaoMoShi } from './狂暴模式'
import { createExecuteAnBingBuDong } from './按兵不动'
import { createExecuteJiLaiZeAn } from './既来则安'
import { createExecuteFanGeYiJi } from './反戈一击'
import { createExecuteAnDuChenCang } from './暗度陈仓'
import { createExecuteShengDongJiXi } from './声东击西'
import { createExecuteYiYiDaiLao } from './以逸待劳'
import { createExecuteCaoChuanJieJian } from './草船借箭'
import { createExecuteWeiWeiJiuZhao } from './围魏救赵'
import { createExecuteYuQinGuZong } from './欲擒故纵'
import { createExecuteYunTouZhuanXiang } from './晕头转向'
import { createExecuteGeAnGuanHuo } from './隔岸观火'
import { createExecuteTiaoBoBaoLiJian } from './挑拨离间'
import { createExecuteChenHuoDaJie } from './趁火打劫'
import { createExecuteYuSuiWaQuan } from './玉碎瓦全'
import { createExecuteHeZongLianHeng } from './合纵连横'
import { createExecuteMuBuZhuanJing } from './寸步难行'
import { createExecutePaoZhuanYinYu } from './抛砖引玉'

/**
 * battleSkills 统一入口：逐个创建单技能实现并返回与原实现完全一致的 API
 */
export function useBattleSkills() {
  const gameStore = useGameStore()

  const executeQinZeiQinWang = createExecuteQinZeiQinWang(gameStore)
  const executeCaoMuJieBing = createExecuteCaoMuJieBing(gameStore)
  const executeYueZhanYueYong = createExecuteYueZhanYueYong(gameStore)
  const executeXiYinGongJi = createExecuteXiYinGongJi(gameStore)
  const executeTongQiangTieBi = createExecuteTongQiangTieBi(gameStore)
  const executeBeiShuiYiZhan = createExecuteBeiShuiYiZhan(gameStore)
  const executeLiaoShiRuShen = createExecuteLiaoShiRuShen(gameStore)
  const executeTongGuiYuJin = createExecuteTongGuiYuJin(gameStore)
  const executeSetBarrier = createExecuteSetBarrier(gameStore)
  const executeQianNengJiFa = createExecuteQianNengJiFa(gameStore)
  const executeYuJiaQinZheng = createExecuteYuJiaQinZheng(gameStore)
  const executeKuangBaoMoShi = createExecuteKuangBaoMoShi(gameStore)
  const executeAnBingBuDong = createExecuteAnBingBuDong(gameStore)
  const executeJiLaiZeAn = createExecuteJiLaiZeAn(gameStore)
  const executeFanGeYiJi = createExecuteFanGeYiJi(gameStore)
  const executeAnDuChenCang = createExecuteAnDuChenCang(gameStore)
  const executeShengDongJiXi = createExecuteShengDongJiXi(gameStore)
  const executeYiYiDaiLao = createExecuteYiYiDaiLao(gameStore)
  const executeCaoChuanJieJian = createExecuteCaoChuanJieJian(gameStore)
  const executeWeiWeiJiuZhao = createExecuteWeiWeiJiuZhao(gameStore)
  const executeYuQinGuZong = createExecuteYuQinGuZong(gameStore)
  const executeYunTouZhuanXiang = createExecuteYunTouZhuanXiang(gameStore)
  const executeGeAnGuanHuo = createExecuteGeAnGuanHuo(gameStore)
  const executeTiaoBoBaoLiJian = createExecuteTiaoBoBaoLiJian(gameStore)
  const executeChenHuoDaJie = createExecuteChenHuoDaJie(gameStore)
  const executeYuSuiWaQuan = createExecuteYuSuiWaQuan(gameStore)
  const executeHeZongLianHeng = createExecuteHeZongLianHeng(gameStore)
  const executeMuBuZhuanJing = createExecuteMuBuZhuanJing(gameStore)
  const executePaoZhuanYinYu = createExecutePaoZhuanYinYu(gameStore)

  return {
    executeQinZeiQinWang,
    executeCaoMuJieBing,
    executeYueZhanYueYong,
    executeXiYinGongJi,
    executeTongQiangTieBi,
    executeBeiShuiYiZhan,
    executeLiaoShiRuShen,
    executeTongGuiYuJin,
    executeSetBarrier,
    executeQianNengJiFa,
    executeYuJiaQinZheng,
    executeKuangBaoMoShi,
    executeAnBingBuDong,
    executeJiLaiZeAn,
    executeFanGeYiJi,
    executeAnDuChenCang,
    executeShengDongJiXi,
    executeYiYiDaiLao,
    executeCaoChuanJieJian,
    executeWeiWeiJiuZhao,
    executeYuQinGuZong,
    executeYunTouZhuanXiang,
    executeGeAnGuanHuo,
    executeTiaoBoBaoLiJian,
    executeChenHuoDaJie,
    executeYuSuiWaQuan,
    executeHeZongLianHeng,
    executeMuBuZhuanJing,
    executePaoZhuanYinYu
  }
}
