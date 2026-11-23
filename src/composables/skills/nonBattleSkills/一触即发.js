/**
 * 金币技能：一触即发
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYiChuJiFa(gameStore) {
  return function executeYiChuJiFa(caster, skillName) {
    // 如果没有提供技能名称，返回需要选择
    if (!skillName) {
      // 获取所有冷却中的技能
      const coolingSkills = []

      if (gameStore.cooldowns && gameStore.cooldowns[caster.name]) {
        const myCooldowns = gameStore.cooldowns[caster.name]
        for (const [name, rounds] of Object.entries(myCooldowns)) {
          if (rounds > 0) {
            coolingSkills.push({
              name: name,
              remainingRounds: rounds
            })
          }
        }
      }

      if (coolingSkills.length === 0) {
        return {
          success: false,
          message: '当前没有冷却中的技能！'
        }
      }

      return {
        success: false,
        message: '请选择要清除冷却的技能',
        needSelection: true,
        data: {
          coolingSkills: coolingSkills
        }
      }
    }

    // 检查技能是否在冷却中
    const cooldownRemaining = gameStore.getSkillCooldown(caster.name, skillName)
    if (cooldownRemaining <= 0) {
      return {
        success: false,
        message: `${skillName}没有在冷却中`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('一触即发', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 清零冷却
    gameStore.clearSkillCooldown(caster.name, skillName)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '一触即发',
      `${caster.name}使用了一触即发，${skillName}的冷却已清零（原剩余${cooldownRemaining}回合）`,
      `${caster.name}使用了一触即发`
    )

    return {
      success: true,
      message: `${skillName}的冷却已清零，可以立即使用`
    }
  }
}
