/**
 * 金币技能：背水一战
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteBeiShuiYiZhan(gameStore) {
  return function executeBeiShuiYiZhan(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('背水一战', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    selfCity.modifiers = selfCity.modifiers || []
    selfCity.modifiers.push({
      type: 'power_multiplier',
      value: TUNE.beiShuiYiZhan.value,
      duration: TUNE.beiShuiYiZhan.duration
    })
    selfCity.modifiers.push({
      type: 'suicide_attack',
      duration: TUNE.beiShuiYiZhan.duration
    })
    // 新增：若未消灭对方，淘汰前对所有对方出战城市造成5000HP伤害
    selfCity.modifiers.push({
      type: 'desperate_retaliation',  // 背水反击
      damage: TUNE.beiShuiYiZhan.damage,
      duration: TUNE.beiShuiYiZhan.duration
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '背水一战',
      `${caster.name}使用了背水一战，${selfCity.name} 获得背水一战效果，攻击力×2，结算特殊`,
      `${caster.name}对 ${selfCity.name} 使用了背水一战`
    )

    return {
      success: true,
      message: `${selfCity.name} 攻击力翻倍，若消灭对方则自毁；若未消灭则反击全体5000HP`
    }
  }
}
