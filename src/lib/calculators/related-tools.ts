export interface CalculatorRelatedToolLink {
  slug: string;
  reason: string;
}

/**
 * Контекстные переходы из калькулятора в инструмент, который решает следующий
 * самостоятельный шаг. Эти ссылки рендерятся на сервере и не зависят от того,
 * запускал ли пользователь клиентскую форму.
 */
export const CALCULATOR_RELATED_TOOLS: Record<string, CalculatorRelatedToolLink[]> = {
  "paneli-dlya-sten": [
    {
      slug: "raskladka-reek",
      reason: "Разложить декоративные рейки, выровнять крайние поля и увидеть шаг на стене.",
    },
  ],
  kirpich: [
    {
      slug: "raskladka-kirpicha",
      reason: "Построить лицевую схему рядов, перевязки и краевых подрезок для одного участка.",
    },
  ],
  "kladka-kirpicha": [
    {
      slug: "raskladka-kirpicha",
      reason: "Проверить на схеме ряды, швы и краевые подрезки до закупки кирпича.",
    },
  ],
  "oblitsovochnyj-kirpich": [
    {
      slug: "raskladka-kirpicha",
      reason: "Сравнить лицевой рисунок кладки и проверить подрезки отдельного участка фасада.",
    },
  ],
  "trotuarnaya-plitka": [
    {
      slug: "raskladka-trotuarnoy-plitki",
      reason: "Увидеть ряды, швы и крайние подрезки по формату выбранной тротуарной плитки.",
    },
  ],
  "natyazhnoj-potolok": [
    {
      slug: "rasstanovka-svetilnikov",
      reason: "Расставить заданное количество точечных светильников с ровными отступами и шагом.",
    },
  ],
  "podvesnoy-potolok-gkl": [
    {
      slug: "rasstanovka-svetilnikov",
      reason: "Построить геометрическую сетку светильников по размерам потолка и крайним отступам.",
    },
  ],
  "reechnyj-potolok": [
    {
      slug: "rasstanovka-svetilnikov",
      reason: "Проверить симметрию светильников на плане до разметки реечного потолка.",
    },
  ],
  gruntovka: [
    {
      slug: "normy-raskhoda",
      reason: "Сверить базовый расход на квадратный метр и условия применения с техкартой продукта.",
    },
  ],
  shpaklevka: [
    {
      slug: "normy-raskhoda",
      reason: "Сопоставить расход на квадратный метр с толщиной слоя и данными производителя.",
    },
  ],
  kraska: [
    {
      slug: "normy-raskhoda",
      reason: "Проверить типовой расход краски по числу слоёв перед вводом данных с упаковки.",
    },
  ],
  shtukaturka: [
    {
      slug: "normy-raskhoda",
      reason: "Сопоставить расход штукатурки на квадратный метр для выбранной толщины слоя.",
    },
  ],
  "klej-dlya-plitki": [
    {
      slug: "normy-raskhoda",
      reason: "Сверить типовой расход клея с форматом плитки, зубом шпателя и техкартой состава.",
    },
  ],
  styazhka: [
    {
      slug: "normy-raskhoda",
      reason: "Проверить, как толщина слоя влияет на расход сухой смеси на квадратный метр.",
    },
  ],
};
