/**
 * 金币技能：海市蜃楼
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHaiShiShenLou(gameStore) {
  return function executeHaiShiShenLou(caster) {
    const gameMode = gameStore.gameMode || '2P'
    const is2p = (gameMode === '2P' || gameMode === '2v2')

    if (!is2p) {
      return { success: false, message: '此技能仅限2人/2v2模式使用！' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('海市蜃楼', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 创建中心投影
    if (!gameStore.mirage) {
      gameStore.mirage = {}
    }

    gameStore.mirage[caster.name] = {
      roundsLeft: TUNE.haiShiShenLou.rounds,
      blocked: 0,  // 拦截计数
      active: true
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '海市蜃楼',
      `${caster.name}使用了海市蜃楼，创建中心投影，持续5回合（75%概率拦截对中心的伤害）`,
      `${caster.name}使用了海市蜃楼`
    )

    return {
      success: true,
      message: '海市蜃楼使用成功！中心投影已创建，持续5回合'
    }
  }
}
