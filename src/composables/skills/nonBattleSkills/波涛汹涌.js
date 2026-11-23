/**
 * 金币技能：波涛汹涌
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBoTaoXiongYong(gameStore) {
  return function executeBoTaoXiongYong(caster, target) {
    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '波涛汹涌')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '波涛汹涌',
        `${caster.name}使用波涛汹涌，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了波涛汹涌`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('波涛汹涌', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 第一部分：获取对手所有沿海城市
    const coastalCityNames = new Set([
      '上海市', '天津市', '香港特别行政区', '澳门特别行政区', '唐山市', '秦皇岛市', '沧州市',
      '大连市', '丹东市', '锦州市', '营口市', '盘锦市', '葫芦岛市', '南通市', '连云港市', '盐城市',
      '宁波市', '温州市', '嘉兴市', '台州市', '舟山市', '福州市', '莆田市',
      '泉州市', '厦门市', '漳州市', '宁德市', '青岛市', '东营市', '烟台市', '威海市', '日照市',
      '潍坊市', '滨州市', '德州市', '广州市', '深圳市', '珠海市', '汕头市', '湛江市', '江门市', '茂名市',
      '惠州市', '汕尾市', '阳江市', '东莞市', '中山市', '潮州市', '揭阳市', '北海市', '钦州市',
      '防城港市', '海口市', '三亚市', '三沙市', '琼海市', '文昌市', '万宁市', '澄迈县', '临高县',
      '东方市', '昌江县', '乐东县', '陵水县', '儋州市', '桃园市', '新北市', '基隆市', '台南市',
      '台中市', '新竹市', '高雄市', '彰化县', '新竹县', '澎湖县', '台东县', '宜兰县', '屏东县',
      '嘉义县', '云林县', '花莲县', '苗栗县'
    ])
    const coastalCities = []

    Object.entries(target.cities).forEach(([cityName, city]) => {
      if (city && city.isAlive !== false && coastalCityNames.has(city.name)) {
        coastalCities.push({ city, cityName })
      }
    })

    // 对所有沿海城市HP减半
    const affectedCities = []
    const blockedCities = []

    for (const { city, cityName } of coastalCities) {
      // 跳过副中心城市（免疫效果）
      if (gameStore.isSubCenter(target.name, cityName)) continue

      // 检查并消耗保护罩/钢铁护盾
      if (gameStore.consumeProtection(target.name, cityName)) {
        blockedCities.push(city.name)
        continue
      }

      // 沿海城市HP减半
      const currentHp = city.currentHp || city.hp
      const newHp = Math.floor(currentHp / TUNE.boTaoXiongYong.hpDivisor)
      city.currentHp = newHp

      // 检查是否阵亡
      if (newHp <= 0) {
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

    // 第二部分：设置本回合出战沿海城市战斗前再次减半的标记
    if (!gameStore.botaoxiongyong) {
      gameStore.botaoxiongyong = {}
    }
    gameStore.botaoxiongyong[target.name] = {
      active: true,
      roundsLeft: TUNE.boTaoXiongYong.roundsLeft  // 仅本回合有效
    }

    // 记录日志
    if (blockedCities.length > 0) {
      addSkillEffectLog(gameStore, `波涛汹涌被${target.name}的${blockedCities.length}个城市护盾抵消`)
    }

    const logMessage = affectedCities.length > 0
      ? `${caster.name}对${target.name}使用波涛汹涌，${affectedCities.length}个沿海城市HP减半，本回合出战沿海城市战斗前将再次减半`
      : `${caster.name}对${target.name}使用波涛汹涌，本回合出战沿海城市战斗前HP将减半`

    addSkillEffectLog(gameStore, logMessage)


    if (affectedCities.length === 0 && blockedCities.length === 0) {
      return {
        success: true,
        message: '本回合出战沿海城市战斗前HP将减半'
      }
    }

    if (affectedCities.length === 0 && blockedCities.length > 0) {
      return {
        success: true,
        message: '所有沿海城市被护盾保护，但本回合出战沿海城市战斗前HP仍将减半'
      }
    }

    return {
      success: true,
      message: `${affectedCities.length}个沿海城市HP减半${blockedCities.length > 0 ? `（${blockedCities.length}个被护盾保护）` : ''}，本回合出战沿海城市战斗前将再次减半`
    }
  }
}
