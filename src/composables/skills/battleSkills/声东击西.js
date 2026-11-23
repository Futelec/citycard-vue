/**
 * 金币技能：声东击西
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteShengDongJiXi(gameStore) {
  return function executeShengDongJiXi(caster, target) {
    // 检查游戏模式（仅限3P）
    if (gameStore.gameMode !== '3P') {
      return {
        success: false,
        message: '声东击西仅限3人模式使用！'
      }
    }

    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查对手数量（必须正好2个对手）
    const opponents = gameStore.players.filter(p => p.name !== caster.name)
    if (opponents.length !== TUNE.shengDongJiXi.opponentCount) {
      return {
        success: false,
        message: '声东击西需要正好2个对手！'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('声东击西', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置声东击西标记
    gameStore.sdxj[caster.name] = {
      target: target.name,
      active: true
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '声东击西',
      `${caster.name}使用了声东击西，声东击西生效，对${target.name}战力劣势时将转向攻击另一玩家`,
      `${caster.name}对 ${target.name} 使用了声东击西`
    )

    return {
      success: true,
      message: `对${target.name}使用了声东击西，战力劣势时将转向攻击另一玩家`
    }
  }
}
