/**
 * 金币技能：趁火打劫
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteChenHuoDaJie(gameStore) {
  return function executeChenHuoDaJie(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('趁火打劫', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 初始化chhdj结构
    if (!gameStore.chhdj) {
      gameStore.chhdj = {}
    }

    // 获取游戏模式
    const gameMode = gameStore.gameMode || '2P'

    // 设置趁火打劫标记
    gameStore.chhdj[caster.name] = {
      mode: gameMode,
      target: target.name,
      damageDealt: 0
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '趁火打劫',
      `${caster.name}使用了趁火打劫，趁火打劫生效，根据本轮造成的伤害抢夺金币（每1500伤害抢1金币，最多10金币）`,
      `你对${target.name}使用了趁火打劫`
    )

    return {
      success: true,
      message: `对${target.name}使用了趁火打劫，本轮造成的伤害将转化为金币`
    }
  }
}
