/**
 * 金币技能：合纵连横
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteHeZongLianHeng(gameStore) {
  return function executeHeZongLianHeng(caster, ally) {
    // 检查游戏模式（仅限3P）
    if (gameStore.gameMode !== '3P') {
      return {
        success: false,
        message: '合纵连横仅限3人模式使用！'
      }
    }

    if (!ally) {
      return { success: false, message: '未选择盟友' }
    }

    // 检查对手数量（必须正好2个对手）
    const opponents = gameStore.players.filter(p => p.name !== caster.name)
    if (opponents.length !== TUNE.heZongLianHeng.opponentCount) {
      return {
        success: false,
        message: '合纵连横需要正好2个对手！'
      }
    }

    // 检查盟友是否是对手之一
    if (!opponents.some(p => p.name === ally.name)) {
      return {
        success: false,
        message: '盟友必须是对手之一！'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('合纵连横', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 找到第三方
    const thirdParty = opponents.find(p => p.name !== ally.name)

    // 设置合纵连横标记
    if (!gameStore.hzlh) gameStore.hzlh = {}
    gameStore.hzlh[caster.name] = {
      ally: ally.name,
      target: thirdParty.name,
      roundsLeft: TUNE.heZongLianHeng.roundsLeft,
      startRound: gameStore.currentRound
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '合纵连横',
      `${caster.name}使用了合纵连横，合纵连横生效，与${ally.name}停战2回合，共同攻击${thirdParty.name}`,
      `你对${ally.name}使用了合纵连横`
    )

    return {
      success: true,
      message: `与${ally.name}停战2回合，共同攻击${thirdParty.name}`
    }
  }
}
