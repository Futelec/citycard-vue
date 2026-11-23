/**
 * 金币技能：釜底抽薪
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteFuDiChouXin(gameStore) {
  return function executeFuDiChouXin(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '釜底抽薪')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '釜底抽薪',
        `${caster.name}使用釜底抽薪，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了釜底抽薪`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('釜底抽薪', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化costIncrease结构
    if (!gameStore.costIncrease) {
      gameStore.costIncrease = {}
    }

    // 设置目标玩家的费用增加标记
    gameStore.costIncrease[target.name] = 1

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了釜底抽薪',
      `${caster.name}对${target.name}使用了釜底抽薪，${target.name}下一次使用8金币及以上技能时费用增加50%`,
      `${caster.name}使用了了釜底抽薪`
    )

    return {
      success: true,
      message: `${target.name}下次使用高级技能（8+金币）时费用将增加50%`
    }
  }
}
