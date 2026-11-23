/**
 * 金币技能：解除封锁
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJieChuFengSuo(gameStore) {
  return function executeJieChuFengSuo(caster, skillName) {
    // 收集所有被禁用的技能
    const bannedSkillsSet = new Set()

    // 事半功倍禁用的技能
    if (gameStore.bannedSkills && gameStore.bannedSkills[caster.name]) {
      Object.keys(gameStore.bannedSkills[caster.name]).forEach(skill => bannedSkillsSet.add(skill))
    }

    // 过河拆桥禁用的技能
    if (gameStore.burnBridge) {
      for (const otherPlayerName in gameStore.burnBridge) {
        if (otherPlayerName === caster.name) continue

        const burnBridgeState = gameStore.burnBridge[otherPlayerName]
        if (burnBridgeState && burnBridgeState.bannedSkills) {
          // 检查2v2队友
          let isTeammate = false
          if (gameStore.gameMode === '2v2') {
            const otherPlayer = gameStore.players.find(p => p.name === otherPlayerName)
            if (otherPlayer && caster.team !== undefined && otherPlayer.team !== undefined) {
              isTeammate = caster.team === otherPlayer.team
            }
          }

          if (!isTeammate) {
            burnBridgeState.bannedSkills.forEach(skill => bannedSkillsSet.add(skill))
          }
        }
      }
    }

    // 强制搬运禁用的技能
    if (gameStore.forcedSoldierBan) {
      for (const otherPlayerName in gameStore.forcedSoldierBan) {
        if (otherPlayerName === caster.name) continue

        const banData = gameStore.forcedSoldierBan[otherPlayerName]
        if (banData && banData.bannedSkills) {
          // 检查2v2队友
          let isTeammate = false
          if (gameStore.gameMode === '2v2') {
            const otherPlayer = gameStore.players.find(p => p.name === otherPlayerName)
            if (otherPlayer && caster.team !== undefined && otherPlayer.team !== undefined) {
              isTeammate = caster.team === otherPlayer.team
            }
          }

          if (!isTeammate) {
            banData.bannedSkills.forEach(skill => bannedSkillsSet.add(skill))
          }
        }
      }
    }

    const bannedSkills = Array.from(bannedSkillsSet)

    if (bannedSkills.length === 0) {
      return { success: false, message: '当前没有被禁用的技能！' }
    }

    // 如果没有指定技能，返回列表让前端选择
    if (!skillName) {
      return {
        success: true,
        message: '请选择要解除禁用的技能',
        data: {
          bannedSkills: bannedSkills,
          needSelection: true
        }
      }
    }

    // 检查技能是否在禁用列表中
    if (!bannedSkills.includes(skillName)) {
      return { success: false, message: '该技能未被禁用！' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('解除封锁', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 从各个禁用源中移除该技能
    if (gameStore.bannedSkills && gameStore.bannedSkills[caster.name]) {
      delete gameStore.bannedSkills[caster.name][skillName]
    }

    if (gameStore.burnBridge) {
      for (const otherPlayerName in gameStore.burnBridge) {
        const burnBridgeState = gameStore.burnBridge[otherPlayerName]
        if (burnBridgeState && burnBridgeState.bannedSkills) {
          const index = burnBridgeState.bannedSkills.indexOf(skillName)
          if (index !== -1) {
            burnBridgeState.bannedSkills.splice(index, 1)
          }
        }
      }
    }

    if (gameStore.forcedSoldierBan) {
      for (const otherPlayerName in gameStore.forcedSoldierBan) {
        const banData = gameStore.forcedSoldierBan[otherPlayerName]
        if (banData && banData.bannedSkills) {
          const index = banData.bannedSkills.indexOf(skillName)
          if (index !== -1) {
            banData.bannedSkills.splice(index, 1)
          }
        }
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '解除封锁',
      `${caster.name}使用了解除封锁，${skillName}的禁用状态已解除`,
      `${caster.name}使用了解除封锁`
    )

    return {
      success: true,
      message: `${skillName}的禁用状态已解除`
    }
  }
}
