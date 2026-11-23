/**
 * 金币技能：计划单列
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJiHuaDanLie(gameStore) {
  return function executeJiHuaDanLie(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('计划单列', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 从cities.js中查找计划单列市的初始HP
    const planCityDefs = TUNE.jiHuaDanLie.cityWeights
    const pool = planCityDefs.map(def => {
      const cityData = ALL_CITIES.find(c => c.name === def.name)
      return { name: def.name, hp: cityData ? cityData.hp : 0, weight: def.weight }
    })

    // 加权随机选择
    const sumWeight = pool.reduce((s, x) => s + x.weight, 0)
    let r = Math.random() * sumWeight
    let pick = pool[0]

    for (const item of pool) {
      if (r < item.weight) {
        pick = item
        break
      }
      r -= item.weight
    }

    // 找出当前HP低于抽到城市初始HP的存活城市
    const candidates = []
    Object.entries(caster.cities).forEach(([cityName, city]) => {
      if (!city || (city.currentHp || city.hp) <= 0 || city.isAlive === false) return
      const curHp = city.currentHp || city.hp
      if (curHp < pick.hp) {
        candidates.push({ cityName, city, curHp })
      }
    })

    // 最多5座城市，超过则随机选取
    let selected = candidates
    if (candidates.length > TUNE.jiHuaDanLie.maxCandidates) {
      selected = [...candidates].sort(() => Math.random() - 0.5).slice(0, TUNE.jiHuaDanLie.maxCandidates)
    }

    let hpChanged = 0
    const affectedCities = []

    for (const { cityName, city, curHp } of selected) {
      const beforeHp = curHp
      city.currentHp = pick.hp
      hpChanged++
      affectedCities.push({
        name: city.name,
        beforeHp: Math.floor(beforeHp),
        afterHp: Math.floor(pick.hp)
      })
    }

    const summary = affectedCities.map(c =>
      `${c.name}(${c.beforeHp}→${c.afterHp})`
    ).join('、')

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '计划单列',
      `${caster.name}使用了计划单列，抽到${pick.name}(${pick.hp})，提升了${hpChanged}个城市当前HP`,
      `${caster.name}使用了计划单列\n抽到${pick.name}(${pick.hp})，提升了${hpChanged}个城市当前HP。${summary}`
    )

    return {
      success: true,
      message: `抽到${pick.name}(${pick.hp})，提升${hpChanged}个城市当前HP`,
      data: {
        selectedCity: pick.name,
        selectedHp: pick.hp,
        hpChanged: hpChanged,
        affected: affectedCities
      }
    }
  }
}
