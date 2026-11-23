/**
 * 金币技能：降维打击
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJiangWeiDaJi(gameStore) {
  return function executeJiangWeiDaJi(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 不能对澳门使用
    if (targetCity.name === '澳门特别行政区') {
      return { success: false, message: '不能对澳门使用降维打击' }
    }

    // 检查是否为直辖市或香港（特殊版本：10金币→澳门）
    const municipalities = ['北京市', '上海市', '天津市', '重庆市', '香港特别行政区']
    const isMunicipality = municipalities.includes(targetCity.name)

    // 特殊版本：直辖市/香港→澳门（10金币）
    if (isMunicipality) {
      // 检查是否为中心城市
      const cityName = targetCity.name
      if (targetCity.isCenter || cityName === target.centerCityName) {
        return { success: false, message: '不能对中心城市使用降维打击' }
      }

      // 手动扣除金币（直辖市/香港版本比基础费用多2金币）
      if (caster.gold < (SKILL_COSTS['降维打击'] + TUNE.jiangWeiDaJi.municipalitySurcharge)) {
        return {
          success: false,
          message: `金币不足（需要${SKILL_COSTS['降维打击'] + TUNE.jiangWeiDaJi.municipalitySurcharge}，当前${caster.gold}）`
        }
      }
      caster.gold -= (SKILL_COSTS['降维打击'] + TUNE.jiangWeiDaJi.municipalitySurcharge)

      // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
      if (gameStore.isSubCenter(target.name, cityName)) {
        addSkillUsageLog(gameStore, caster.name, '降维打击',
          `${caster.name}使用了降维打击，但目标是副中心城市，技能无效`,
          `${caster.name}使用了降维打击`)
        return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
      }

      // 获取澳门城市数据
      const macau = gameStore.getCityByName('澳门特别行政区')
      if (!macau) {
        return { success: false, message: '找不到澳门城市数据' }
      }

      // 创建澳门城市
      const replacementCity = {
        name: '澳门特别行政区',
        hp: macau.hp,
        currentHp: macau.hp,
        baseHp: macau.hp,
        isAlive: true,
        red: macau.red || 0,
        green: macau.green || 0,
        blue: macau.blue || 0,
        yellow: macau.yellow || 0,
        modifiers: []
      }

      // 替换城市
      target.cities[cityName] = replacementCity

      // 保留步步高升状态（更新originalHp为澳门HP）
      if (gameStore.bbgs && gameStore.bbgs[target.name] && gameStore.bbgs[target.name][cityName]) {
        gameStore.bbgs[target.name]['澳门特别行政区'] = gameStore.bbgs[target.name][cityName]
        gameStore.bbgs[target.name]['澳门特别行政区'].originalHp = macau.hp
        delete gameStore.bbgs[target.name][cityName]
      }

      // 标记澳门为已使用
      gameStore.markCityAsUsed('澳门特别行政区')

      // 更新initialCities
      if (gameStore.initialCities[target.name] && gameStore.initialCities[target.name][cityName]) {
        gameStore.initialCities[target.name][cityName] = replacementCity
      }

      addSkillEffectLog(gameStore, `对${target.name}使用降维打击（直辖市/香港版，花费10金币），城市被替换`)

      return {
        success: true,
        message: `${targetCity.name} → 澳门特别行政区(HP: ${macau.hp})`
      }
    }

    // 普通版本：同省更低等级城市（8金币）
    const goldCheck = checkAndDeductGold('降维打击', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCity.name)) {
      addSkillUsageLog(gameStore, caster.name, '降维打击',
        `${caster.name}使用了降维打击，但目标是副中心城市，技能无效`,
        `${caster.name}使用了降维打击`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 获取该城市所属省份（考虑拔旗易帜changeFlagMark）
    let province = gameStore.getProvinceOfCity(targetCity.name)
    if (gameStore.changeFlagMark &&
        gameStore.changeFlagMark[target.name] &&
        gameStore.changeFlagMark[target.name][targetCity.name]) {
      const newProvName = gameStore.changeFlagMark[target.name][targetCity.name].newProvince
      // 通过省份名称查找省份对象
      const provKey = Object.keys(PROVINCE_MAP).find(key => PROVINCE_MAP[key].name === newProvName)
      if (provKey) {
        province = PROVINCE_MAP[provKey]
      }
    }
    if (!province) {
      return { success: false, message: '无法确定城市所属省份' }
    }

    // 获取同省所有城市
    const provinceCities = province.cities

    // 筛选HP更低且未使用的城市
    const targetHp = targetCity.hp
    const unusedCities = gameStore.getUnusedCities()

    const lowerCities = provinceCities.filter(city => {
      // 必须HP更低
      if (city.hp >= targetHp) return false

      // 必须未被使用
      const isUnused = unusedCities.some(uc => uc.name === city.name)
      return isUnused
    })

    // 如果没有更低等级的城市
    if (lowerCities.length === 0) {
      return {
        success: false,
        message: `${province.name}中没有HP更低的未使用城市`
      }
    }

    // 随机选择一个更低等级的城市
    const newCity = lowerCities[Math.floor(Math.random() * lowerCities.length)]

    // 创建新城市（继承部分属性）
    const replacementCity = {
      name: newCity.name,
      hp: newCity.hp,
      currentHp: newCity.hp,
      baseHp: newCity.hp,
      isAlive: true,
      red: newCity.red || 0,
      green: newCity.green || 0,
      blue: newCity.blue || 0,
      yellow: newCity.yellow || 0,
      modifiers: []
    }

    // 找到原城市在对象中的键
    const targetCityKey = targetCity.name
    if (!target.cities[targetCityKey]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 替换城市：删除旧键，添加新键
    delete target.cities[targetCityKey]
    target.cities[replacementCity.name] = replacementCity

    // 保留步步高升状态（更新originalHp为新城市HP）
    if (gameStore.bbgs && gameStore.bbgs[target.name] && gameStore.bbgs[target.name][targetCityKey]) {
      gameStore.bbgs[target.name][replacementCity.name] = gameStore.bbgs[target.name][targetCityKey]
      gameStore.bbgs[target.name][replacementCity.name].originalHp = replacementCity.hp
      delete gameStore.bbgs[target.name][targetCityKey]
    }

    // 标记新城市为已使用
    gameStore.markCityAsUsed(newCity.name)

    // 更新initialCities
    if (gameStore.initialCities[target.name] && gameStore.initialCities[target.name][targetCityKey]) {
      gameStore.initialCities[target.name][targetCityKey] = replacementCity
    }

    addSkillEffectLog(gameStore, `对${target.name}使用降维打击，城市被替换`)

    return {
      success: true,
      message: `${targetCity.name} → ${replacementCity.name}(HP: ${replacementCity.hp})`
    }
  }
}
