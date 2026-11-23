/**
 * 金币技能：草木皆兵
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteCaoMuJieBing(gameStore) {
  return function executeCaoMuJieBing(caster, target) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('草木皆兵', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    if (!target.battleModifiers) target.battleModifiers = []

    target.battleModifiers.push({
      type: 'damage_reduction',
      value: TUNE.caoMuJieBing.value,
      duration: TUNE.caoMuJieBing.duration,
      source: caster.name
    })

    // 记录草木皆兵状态，用于检查目标是否出牌
    if (!gameStore.cmjb) gameStore.cmjb = {}
    gameStore.cmjb[caster.name] = {
      target: target.name,
      mode: gameStore.gameMode
    }

    // 仅私密日志（公开日志在battle2P中战斗计算时输出，避免提前暴露）
    gameStore.addPrivateLog(caster.name, `${caster.name}对 ${target.name} 使用了草木皆兵`)

    return {
      success: true,
      message: `对 ${target.name} 造成的伤害本轮减半，若不出牌可抢走1金币`,
      targetName: target.name,  // 传递目标信息
      hidePublicLog: true  // 战斗技能效果在battle2P中公开，此处不公开
    }
  }
}
