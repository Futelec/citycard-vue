/**
 * 金币技能：隔岸观火
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteGeAnGuanHuo(gameStore) {
  return function executeGeAnGuanHuo(caster, target) {
    // 检查游戏模式（仅限3P）
    if (gameStore.gameMode !== '3P') {
      return {
        success: false,
        message: '隔岸观火仅限3人模式使用！'
      }
    }

    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查本轮是否已有人使用隔岸观火
    if (gameStore.gawhUser.value && gameStore.gawhUser.value.round === gameStore.currentRound) {
      return {
        success: false,
        message: `本轮${gameStore.gawhUser.value.player}已使用隔岸观火，你无法再使用！`
      }
    }

    // 记录本轮首个使用者
    gameStore.gawhUser.value = {
      player: caster.name,
      round: gameStore.currentRound
    }

    // 获取所有玩家（3人）
    const allPlayers = gameStore.players
    if (allPlayers.length !== TUNE.geAnGuanHuo.playerCount) {
      return {
        success: false,
        message: '隔岸观火需要正好3个玩家！'
      }
    }

    // 找到另外两个对手
    const opponents = allPlayers.filter(p => p.name !== caster.name)
    if (opponents.length !== TUNE.geAnGuanHuo.opponentCount) {
      return {
        success: false,
        message: '无法找到另外两个对手！'
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '隔岸观火',
      `隔岸观火生效，${caster.name}本轮撤兵，${opponents[0].name}和${opponents[1].name}互相攻击`,
      `你对${target.name}使用了隔岸观火`
    )

    return {
      success: true,
      message: `你本轮撤兵，${opponents[0].name}和${opponents[1].name}将互相攻击`
    }
  }
}
