/**
 * 金币技能：移花接木
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYiHuaJieMu(gameStore) {
  return function executeYiHuaJieMu(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查skillUsageTracking记录
    const targetUsage = gameStore.skillUsageTracking[target.name]
    if (!targetUsage || Object.keys(targetUsage).length < TUNE.yiHuaJieMu.minDistinctSkills) {
      return {
        success: false,
        message: `${target.name}尚未使用足够的技能（需要至少2个不同的非橙卡技能）`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('移花接木', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 筛选非橙卡技能（1-15金币）
    const eligibleSkills = Object.keys(targetUsage).filter(skillName => {
      if (targetUsage[skillName] <= 0) return false

      // 获取技能金币消耗
      const skillCost = SKILL_COSTS[skillName] || 0

      // 只能偷取非橙卡技能（1-15金币）
      return skillCost >= TUNE.yiHuaJieMu.minSkillCost && skillCost <= TUNE.yiHuaJieMu.maxSkillCost
    })

    if (eligibleSkills.length < TUNE.yiHuaJieMu.minEligibleSkills) {
      return {
        success: false,
        message: `${target.name}尚未使用足够的可偷取技能（需要至少2个非橙卡技能）`
      }
    }

    // 随机抽取一个技能
    const stolenSkill = eligibleSkills[Math.floor(Math.random() * eligibleSkills.length)]

    // 初始化stolenSkills结构（添加到gameStore状态中）
    if (!gameStore.stolenSkills) {
      gameStore.stolenSkills = {}
    }
    if (!gameStore.stolenSkills[caster.name]) {
      gameStore.stolenSkills[caster.name] = []
    }

    gameStore.stolenSkills[caster.name].push({
      skillName: stolenSkill,
      roundsLeft: TUNE.yiHuaJieMu.rounds,
      usedCount: 0,
      from: target.name
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '移花接木',
      `${caster.name}对${target.name}使用了移花接木，偷取了技能"${stolenSkill}"（可在接下来3回合内使用）`,
      `${caster.name}使用了移花接木`
    )

    return {
      success: true,
      message: `成功偷取了${target.name}的"${stolenSkill}"技能，可在接下来3回合使用`
    }
  }
}
