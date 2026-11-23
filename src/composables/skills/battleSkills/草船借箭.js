/**
 * 金币技能：草船借箭
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteCaoChuanJieJian(gameStore) {
  return function executeCaoChuanJieJian(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('草船借箭', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置草船借箭标记
    gameStore.ccjj[caster.name] = {
      active: true
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '草船借箭',
      `${caster.name}使用了草船借箭，草船借箭生效，${target.name}的攻击将转为治疗，双方本轮退兵`,
      `${caster.name}对 ${target.name} 使用了草船借箭`
    )

    return {
      success: true,
      message: `对${target.name}使用了草船借箭，本轮对手的攻击将转为治疗，双方退兵`
    }
  }
}
