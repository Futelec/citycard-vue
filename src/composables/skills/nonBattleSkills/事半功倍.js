/**
 * 金币技能：事半功倍
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShiBanGongBei(gameStore) {
  return function executeShiBanGongBei(caster, skillName) {
    if (!skillName) {
      return { success: false, message: '未选择要禁用的技能' }
    }

    // 技能金币映射表（1-15金币技能）
    const SKILL_COST_MAP = TUNE.shiBanGongBei.costs

    const originalCost = SKILL_COST_MAP[skillName]
    if (!originalCost || originalCost < TUNE.shiBanGongBei.minCost || originalCost > TUNE.shiBanGongBei.maxCost) {
      return { success: false, message: '该技能无法被禁用（不在1-15金币范围内）' }
    }

    const banCost = Math.ceil(originalCost / TUNE.shiBanGongBei.costDivisor)

    // 金币检查
    if (caster.gold < banCost) {
      return { success: false, message: `金币不足！需要${banCost}金币，当前只有${caster.gold}金币` }
    }

    // 确定对手列表（2v2模式只禁用对方队伍，2P/3P禁用所有对手）
    const mode = gameStore.gameMode || '2P'
    let opponents
    if (mode === '2v2') {
      const myTeam = caster.team
      opponents = gameStore.players.filter(p => p.team !== myTeam)
    } else {
      opponents = gameStore.players.filter(p => p.name !== caster.name)
    }

    // 初始化 bannedSkills 结构
    if (!gameStore.bannedSkills) {
      gameStore.bannedSkills = {}
    }

    // 检查是否已被禁用
    let alreadyBanned = false
    for (const opp of opponents) {
      if (!gameStore.bannedSkills[opp.name]) {
        gameStore.bannedSkills[opp.name] = {}
      }
      if (gameStore.bannedSkills[opp.name][skillName]) {
        alreadyBanned = true
        break
      }
    }

    if (alreadyBanned) {
      return { success: false, message: `技能"${skillName}"已被禁用` }
    }

    // 检查对手是否有技能保护
    for (const opp of opponents) {
      if (gameStore.skillProtection &&
          gameStore.skillProtection[opp.name] &&
          gameStore.skillProtection[opp.name].roundsLeft > 0) {
        return { success: false, message: `${opp.name}拥有技能保护，无法对其使用事半功倍` }
      }
    }

    // 扣除金币
    caster.gold -= banCost

    // 禁用所有对手的该技能
    for (const opp of opponents) {
      if (!gameStore.bannedSkills[opp.name]) {
        gameStore.bannedSkills[opp.name] = {}
      }
      gameStore.bannedSkills[opp.name][skillName] = {
        bannedBy: caster.name,
        cost: banCost
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      `事半功倍（花费${banCost}金币）`,
      `${caster.name}使用了事半功倍（花费${banCost}金币），禁用所有对手的"${skillName}"技能`,
      `${caster.name}使用了事半功倍（花费${banCost}金币）`
    )

    return {
      success: true,
      message: `成功禁用所有对手的"${skillName}"技能（花费${banCost}金币）`,
      data: {
        bannedSkill: skillName,
        cost: banCost,
        affectedPlayers: opponents.map(opp => opp.name)
      }
    }
  }
}
