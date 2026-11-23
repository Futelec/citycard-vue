/**
 * 金币技能：按兵不动
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteAnBingBuDong(gameStore) {
  return function executeAnBingBuDong(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('按兵不动', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    caster.battleModifiers = caster.battleModifiers || []
    caster.battleModifiers.push({
      type: 'no_deploy',
      duration: TUNE.anBingBuDong.duration
    })

    // 仅私密日志（公开日志在battle2P中战斗计算时输出，避免提前暴露）
    gameStore.addPrivateLog(caster.name, `${caster.name}使用了按兵不动`)

    return {
      success: true,
      message: '本轮不出战任何城市',
      hidePublicLog: true  // 战斗技能效果在battle2P中公开，此处不公开
    }
  }
}
