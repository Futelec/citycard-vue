/**
 * 金币技能：连续打击
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteLianXuDaJi(gameStore) {
  return function executeLianXuDaJi(caster, target, cityNames) {
    if (!cityNames || cityNames.length !== TUNE.lianXuDaJi.requiredCities) {
      return { success: false, message: '需要选择2个城市' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '连续打击')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '连续打击',
        `${caster.name}使用连续打击，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了连续打击`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('连续打击', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 筛选有效城市（存活、非中心）
    const validCities = []
    for (const cityName of cityNames) {
      const city = target.cities[cityName]
      if (!city || city.isAlive === false || city.isCenter) {
        continue
      }
      validCities.push({ city, cityName })
    }

    if (validCities.length !== TUNE.lianXuDaJi.requiredCities) {
      return { success: false, message: '需要选择2个有效的非中心存活城市' }
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    for (const { city, cityName } of validCities) {
      if (gameStore.isSubCenter(target.name, cityName)) {
        addSkillUsageLog(gameStore, caster.name, '连续打击',
          `${caster.name}使用了连续打击，但目标${cityName}是副中心城市，技能无效`,
          `${caster.name}使用了连续打击`)
        return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
      }
    }

    // 对每个城市检查护盾并造成伤害
    const affectedCities = []
    const blockedCities = []

    for (const { city, cityName } of validCities) {
      // 检查并消耗保护罩/钢铁护盾
      if (gameStore.consumeProtection(target.name, cityName)) {
        blockedCities.push(city.name)
        continue
      }

      // 造成伤害：当前HP和初始HP都除以2
      const currentHp = city.currentHp || city.hp
      const newCurrentHp = Math.floor(currentHp / TUNE.lianXuDaJi.hpDivisor)
      const newBaseHp = Math.floor(city.hp / TUNE.lianXuDaJi.hpDivisor)

      city.currentHp = newCurrentHp
      city.hp = newBaseHp  // 同时修改初始HP

      // 检查是否阵亡
      if (newCurrentHp <= 0) {
        city.isAlive = false

        // 添加到deadCities列表
        if (!gameStore.deadCities[target.name]) {
          gameStore.deadCities[target.name] = []
        }
        if (!gameStore.deadCities[target.name].includes(cityName)) {
          gameStore.deadCities[target.name].push(cityName)
        }
      }

      affectedCities.push(city.name)
    }

    // 记录日志
    if (blockedCities.length > 0) {
      addSkillEffectLog(gameStore, `连续打击被${target.name}的${blockedCities.length}个城市护盾抵消`)
    }
    if (affectedCities.length > 0) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '连续打击',
        `${caster.name}对${target.name}的${affectedCities.length}个城市使用连续打击，当前HP和初始HP都除以2`,
        `${caster.name}对${target.name}的${affectedCities.join('、')}使用连续打击，当前HP和初始HP都除以2`
      )
    }

    if (affectedCities.length === 0 && blockedCities.length > 0) {
      return {
        success: true,
        message: '所有伤害被护盾抵消'
      }
    }

    return {
      success: true,
      message: `${affectedCities.join('、')}的HP已减半${blockedCities.length > 0 ? `，${blockedCities.join('、')}被护盾保护` : ''}`
    }
  }
}
