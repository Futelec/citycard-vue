/**
 * 金币技能：潜能激发
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteQianNengJiFa(gameStore) {
  return function executeQianNengJiFa(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('潜能激发', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    let count = 0
    Object.values(caster.cities).forEach(city => {
      if (city.isAlive !== false) {
        const currentHp = city.currentHp || city.hp
        city.currentHp = Math.min(currentHp * TUNE.qianNengJiFa.hpMultiplier, TUNE.qianNengJiFa.hpCap)
        count++
      }
    })

    // 设置溢出伤害效果：前三回合伤害溢出的30%伤害对方中心
    if (!gameStore.qiannengOverflow) {
      gameStore.qiannengOverflow = {}
    }
    gameStore.qiannengOverflow[caster.name] = {
      roundsLeft: TUNE.qianNengJiFa.roundsLeft,
      overflowRate: TUNE.qianNengJiFa.overflowRate  // 30%的溢出伤害转移到对方中心
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '潜能激发',
      `${caster.name}使用了潜能激发，潜能激发生效，${count}个城市HP翻倍，前3回合溢出伤害的30%将伤害对方中心`,
      `${caster.name}使用了潜能激发`
    )

    return {
      success: true,
      message: `所有城市HP翻倍（上限100000），前3回合溢出伤害30%转移至对方中心`
    }
  }
}
