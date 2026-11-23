/**
 * 金币技能：寸步难行
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteMuBuZhuanJing(gameStore) {
  return function executeMuBuZhuanJing(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('寸步难行', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置寸步难行状态（禁用对方技能3回合）
    if (!gameStore.stareDown) {
      gameStore.stareDown = {}
    }
    gameStore.stareDown[target.name] = {
      roundsLeft: TUNE.muBuZhuanJing.roundsLeft,
      source: caster.name
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '寸步难行',
      `${caster.name}使用了寸步难行，寸步难行生效，${target.name}在3回合内不能使用技能（除当机立断）`,
      `你对${target.name}使用了寸步难行`
    )

    return {
      success: true,
      message: `${target.name}在3回合内不能使用技能`
    }
  }
}
