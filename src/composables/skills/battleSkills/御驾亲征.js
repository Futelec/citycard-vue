/**
 * 金币技能：御驾亲征
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteYuJiaQinZheng(gameStore) {
  return function executeYuJiaQinZheng(caster, target) {
    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '御驾亲征')) {
      // 双日志：被阻挡
      addSkillUsageLog(
        gameStore,
        caster.name,
        '御驾亲征',
        `${caster.name}使用了御驾亲征，御驾亲征被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了御驾亲征，但被${target.name}的坚不可摧护盾阻挡`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    const centerCity = Object.values(caster.cities).find(c => c.isCenter)

    if (!centerCity) {
      return { success: false, message: '没有中心城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('御驾亲征', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置御驾亲征标记（在战斗计算中会处理实际效果）
    if (!gameStore.yujia) gameStore.yujia = {}
    gameStore.yujia[caster.name] = {
      target: target.name
    }

    // 双日志：成功
    addSkillUsageLog(
      gameStore,
      caster.name,
      '御驾亲征',
      `${caster.name}使用了御驾亲征，御驾亲征生效，本回合己方至少出战两座城市且中心${centerCity.name}必须出战，出战时直接摧毁对方HP最高的非中心城市`,
      `${caster.name}使用了御驾亲征`
    )

    return {
      success: true,
      message: `本回合己方至少出战两座城市且中心必须出战，直接摧毁对方HP最高的非中心城市，若对方按兵不动则摧毁其HP最高的非中心城市`
    }
  }
}
