/**
 * 金币技能：围魏救赵
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteWeiWeiJiuZhao(gameStore) {
  return function executeWeiWeiJiuZhao(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('围魏救赵', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置围魏救赵标记
    gameStore.wwjz[caster.name] = {
      active: true
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '围魏救赵',
      `${caster.name}使用了围魏救赵，围魏救赵生效`,
      `你对${target.name}使用了围魏救赵`
    )

    return {
      success: true,
      message: `对${target.name}使用了围魏救赵`
    }
  }
}
