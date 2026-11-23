/**
 * 金币技能：设置屏障
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteSetBarrier(gameStore) {
  return function executeSetBarrier(caster) {
    // 检查该玩家是否已有屏障存在
    if (gameStore.barrier[caster.name]) {
      return {
        success: false,
        message: `你已经有屏障存在（剩余${gameStore.barrier[caster.name].hp}HP）`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('设置屏障', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 为该玩家创建屏障
    gameStore.barrier[caster.name] = {
      hp: TUNE.setBarrier.hp,
      maxHp: TUNE.setBarrier.maxHp,
      roundsLeft: TUNE.setBarrier.roundsLeft,
      team: caster.team || 0
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '设置屏障',
      `${caster.name}使用了设置屏障，屏障生效（25000HP，持续5回合）`,
      `你设置了屏障`
    )

    return {
      success: true,
      message: '设置了25000HP的屏障，持续5回合'
    }
  }
}
