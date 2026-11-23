/**
 * 金币技能：金融危机
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJinRongWeiJi(gameStore) {
  return function executeJinRongWeiJi(caster) {
    // 检查是否已在金融危机期间
    if (gameStore.financialCrisis && gameStore.financialCrisis.roundsLeft > 0) {
      return {
        success: false,
        message: `当前还有${gameStore.financialCrisis.roundsLeft}回合处于金融危机状态，不能再次使用！`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('金融危机', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 全部玩家立即获得2金币
    gameStore.players.forEach(player => {
      player.gold = Math.min(TUNE.jinRongWeiJi.goldCap, player.gold + TUNE.jinRongWeiJi.goldGain)
    })

    // 设置金融危机状态（持续3回合）
    gameStore.financialCrisis = { roundsLeft: TUNE.jinRongWeiJi.rounds }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了金融危机',
      `${caster.name}使用了金融危机，全部玩家获得2金币，接下来3回合金币最高的玩家无法获得自动+3金币，其余玩家只能+1金币`,
      `${caster.name}使用了了金融危机`
    )

    return {
      success: true,
      message: '金融危机生效！全部玩家获得2金币，接下来3回合金币收入受限'
    }
  }
}
