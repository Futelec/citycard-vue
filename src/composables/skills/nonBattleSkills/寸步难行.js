/**
 * 金币技能：寸步难行
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteChunBuNanXing(gameStore) {
  return function executeChunBuNanXing(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '寸步难行')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '寸步难行',
        `${caster.name}使用寸步难行，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了寸步难行`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('寸步难行', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化寸步难行状态
    if (!gameStore.stareDown) {
      gameStore.stareDown = {}
    }

    gameStore.stareDown[target.name] = {
      roundsLeft: TUNE.chunBuNanXing.rounds,
      source: caster.name
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '寸步难行',
      `${caster.name}对${target.name}使用了寸步难行，${target.name}在接下来3回合内只能使用当机立断和无懈可击`,
      `${caster.name}使用了寸步难行`
    )

    return {
      success: true,
      message: `${target.name}在接下来3回合内只能使用当机立断和无懈可击`
    }
  }
}
