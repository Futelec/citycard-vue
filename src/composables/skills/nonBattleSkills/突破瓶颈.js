/**
 * 金币技能：突破瓶颈
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteTuPoPingJing(gameStore) {
  return function executeTuPoPingJing(caster, skillName) {
    // 如果没有提供技能名称，返回需要选择
    if (!skillName) {
      // 获取所有已使用过的技能
      const usedSkills = []

      if (gameStore.skillUsageTracking && gameStore.skillUsageTracking[caster.name]) {
        const myTracking = gameStore.skillUsageTracking[caster.name]
        for (const [name, count] of Object.entries(myTracking)) {
          if (count > 0) {
            usedSkills.push({
              name: name,
              usedCount: count
            })
          }
        }
      }

      if (usedSkills.length === 0) {
        return {
          success: false,
          message: '你还没有使用过任何有次数限制的技能！'
        }
      }

      return {
        success: false,
        message: '请选择要突破瓶颈的技能',
        needSelection: true,
        data: {
          usedSkills: usedSkills
        }
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('突破瓶颈', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 减少使用次数计数（相当于增加可用次数）
    const success = gameStore.decreaseSkillUsageCount(caster.name, skillName)

    if (!success) {
      // 退还金币
      caster.gold += goldCheck.cost
      return {
        success: false,
        message: `${skillName}没有使用记录，无法突破瓶颈`
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了突破瓶颈',
      `${caster.name}使用了突破瓶颈，${skillName}的使用次数上限+1`,
      `${caster.name}使用了了突破瓶颈`
    )

    return {
      success: true,
      message: `${skillName}使用次数上限已增加1次`
    }
  }
}
