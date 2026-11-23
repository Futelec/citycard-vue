/**
 * 金币技能：过河拆桥
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteGuoHeChaiQiao(gameStore) {
  return function executeGuoHeChaiQiao(caster) {
    // 检查是否已处于过河拆桥状态
    if (gameStore.burnBridge && gameStore.burnBridge[caster.name] && gameStore.burnBridge[caster.name].active) {
      return { success: false, message: '你已经处于过河拆桥状态！' }
    }

    // 检查对手是否有技能保护
    const mode = gameStore.gameMode || '2P'
    let opponents

    if (mode === '2v2') {
      const myTeam = caster.team
      opponents = gameStore.players.filter(p => p.team !== myTeam)
    } else {
      opponents = gameStore.players.filter(p => p.name !== caster.name)
    }

    for (const opp of opponents) {
      if (gameStore.skillProtection &&
          gameStore.skillProtection[opp.name] &&
          gameStore.skillProtection[opp.name].roundsLeft > 0) {
        return { success: false, message: `${opp.name}拥有技能保护，无法使用过河拆桥！` }
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('过河拆桥', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化过河拆桥状态
    if (!gameStore.burnBridge) {
      gameStore.burnBridge = {}
    }

    gameStore.burnBridge[caster.name] = {
      active: true,
      bannedSkills: []  // 记录已禁用的技能列表
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '过河拆桥',
      `${caster.name}使用了过河拆桥，接下来使用的5个不同技能将对其他玩家禁用`,
      `${caster.name}使用了过河拆桥`
    )

    return {
      success: true,
      message: '过河拆桥生效！接下来使用的5个不同技能将对其他玩家禁用'
    }
  }
}
