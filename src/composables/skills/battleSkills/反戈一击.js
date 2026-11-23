/**
 * 金币技能：反戈一击
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteFanGeYiJi(gameStore) {
  return function executeFanGeYiJi(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查双方城市数是否≥2
    const casterAliveCities = Object.values(caster.cities).filter(c => c.isAlive !== false)
    const targetAliveCities = Object.values(target.cities).filter(c => c.isAlive !== false)

    if (casterAliveCities.length < TUNE.fanGeYiJi.minCities || targetAliveCities.length < TUNE.fanGeYiJi.minCities) {
      return {
        success: false,
        message: '双方城市数都需要≥2才能使用反戈一击'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('反戈一击', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 初始化reflect结构
    if (!gameStore.reflect) {
      gameStore.reflect = {}
    }

    // 设置反击标记（本轮生效）
    gameStore.reflect[caster.name] = {
      target: target.name,
      active: true
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '反戈一击',
      `${caster.name}使用了反戈一击，反戈一击生效，${target.name}的伤害将反弹`,
      `${caster.name}对 ${target.name} 使用了反戈一击`
    )

    return {
      success: true,
      message: `本轮${target.name}对你的伤害将反弹回其出战城市（绿色护盾优先吸收）`
    }
  }
}
