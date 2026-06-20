import { useEffect, useState } from "react";
import Papa from "papaparse";
import "./App.css";

const categoryOrder = ["ごはん", "丼", "麺"];

const categoryIcons = {
  ごはん: "🍚",
  丼: "🥣",
  麺: "🍜",
};

const dishTypeLabels = {
  main: "主菜",
  side: "副菜",
  soup: "汁物",
  staple: "主食",
};

const ingredientCategoryOrder = [
  "肉",
  "魚",
  "野菜",
  "卵",
  "乳製品",
  "主食",
  "乾物",
  "調味料",
  "その他",
];

const ingredientCategoryIcons = {
  肉: "🥩",
  魚: "🐟",
  野菜: "🥬",
  卵: "🥚",
  乳製品: "🥛",
  主食: "🍚",
  乾物: "🍄",
  調味料: "🧂",
  その他: "🛒",
};

function App() {
  const [sets, setSets] = useState([]);
  const [setItems, setSetItems] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);

  const [selectedSet, setSelectedSet] = useState(null);
  const [activeCategory, setActiveCategory] = useState("すべて");
  const [page, setPage] = useState("home");

  const [shoppingDays, setShoppingDays] = useState(3);
  const [selectedSetIds, setSelectedSetIds] = useState([]);

  useEffect(() => {
    Papa.parse("/data/sets.csv", {
      download: true,
      header: true,
      complete: (result) => setSets(result.data.filter((row) => row.set_id)),
    });

    Papa.parse("/data/set_items.csv", {
      download: true,
      header: true,
      complete: (result) =>
        setSetItems(result.data.filter((row) => row.set_id)),
    });

    Papa.parse("/data/dishes.csv", {
      download: true,
      header: true,
      complete: (result) => setDishes(result.data.filter((row) => row.dish_id)),
    });

    Papa.parse("/data/ingredients.csv", {
      download: true,
      header: true,
      complete: (result) =>
        setIngredients(result.data.filter((row) => row.dish_id)),
    });

    Papa.parse("/data/steps.csv", {
      download: true,
      header: true,
      complete: (result) => setSteps(result.data.filter((row) => row.dish_id)),
    });
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCategory = (set) => set.category || set.meal_type;

  const categories = [
    "すべて",
    ...categoryOrder.filter((category) =>
      sets.some((set) => getCategory(set) === category)
    ),
  ];

  const displayedSets =
    activeCategory === "すべて"
      ? sets
      : sets.filter((set) => getCategory(set) === activeCategory);

  const getDishesBySet = (setId) => {
    const items = setItems.filter((item) => item.set_id === setId);

    return items
      .map((item) => {
        const dish = dishes.find((dish) => dish.dish_id === item.dish_id);
        return {
          ...dish,
          setDishType: item.dish_type,
        };
      })
      .filter((dish) => dish.dish_id);
  };

  const groupIngredients = (targetIngredients) => {
    const groupedIngredients = {};

    targetIngredients.forEach((ingredient) => {
      const name = ingredient.ingredient_name;
      const unit = ingredient.unit;
      const quantity = Number(ingredient.quantity);
      const category = ingredient.category || "その他";
      const key = `${name}_${unit}_${category}`;

      if (!groupedIngredients[key]) {
        groupedIngredients[key] = {
          ingredient_name: name,
          quantity: Number.isNaN(quantity) ? ingredient.quantity : quantity,
          unit,
          category,
        };
      } else if (!Number.isNaN(quantity)) {
        groupedIngredients[key].quantity += quantity;
      }
    });

    return Object.values(groupedIngredients);
  };

  const groupIngredientsByCategory = (targetIngredients) => {
    const grouped = {};

    targetIngredients.forEach((ingredient) => {
      const category = ingredient.category || "その他";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(ingredient);
    });

    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) =>
        a.ingredient_name.localeCompare(b.ingredient_name, "ja")
      );
    });

    return ingredientCategoryOrder
      .filter((category) => grouped[category])
      .map((category) => ({
        category,
        items: grouped[category],
      }));
  };

  const getIngredientsByDishes = (targetDishes) => {
    const dishIds = targetDishes.map((dish) => dish.dish_id);

    const selectedIngredients = ingredients.filter((ingredient) =>
      dishIds.includes(ingredient.dish_id)
    );

    return groupIngredients(selectedIngredients);
  };

  const getStepsByDishes = (targetDishes) => {
    return targetDishes.map((dish) => {
      const dishSteps = steps
        .filter((step) => step.dish_id === dish.dish_id)
        .sort((a, b) => Number(a.step_no) - Number(b.step_no));

      return {
        dishName: dish.dish_name,
        steps: dishSteps,
      };
    });
  };

  const openSetDetail = (set) => {
    setSelectedSet(set);
    setPage("detail");
    setTimeout(scrollToTop, 0);
  };

  const backToHome = () => {
    setSelectedSet(null);
    setPage("home");
    setTimeout(scrollToTop, 0);
  };

  const openShopping = () => {
    setSelectedSet(null);
    setPage("shopping");
    setTimeout(scrollToTop, 0);
  };

  const toggleShoppingSet = (setId) => {
    setSelectedSetIds((current) =>
      current.includes(setId)
        ? current.filter((id) => id !== setId)
        : [...current, setId]
    );
  };

  const getIngredientNamesBySetId = (setId) => {
    const targetDishes = getDishesBySet(setId);
    const dishIds = targetDishes.map((dish) => dish.dish_id);

    return ingredients
      .filter((ingredient) => dishIds.includes(ingredient.dish_id))
      .map((ingredient) => ingredient.ingredient_name);
  };

  const autoSelectSets = () => {
    const days = Number(shoppingDays);
    const targetCount = Number.isNaN(days) || days < 1 ? 1 : days;

    let resultIds = [...selectedSetIds];

    const selectedIngredientNames = new Set();

    resultIds.forEach((setId) => {
      getIngredientNamesBySetId(setId).forEach((name) =>
        selectedIngredientNames.add(name)
      );
    });

    while (resultIds.length < targetCount) {
      const candidates = sets.filter((set) => !resultIds.includes(set.set_id));

      if (candidates.length === 0) break;

      const scoredCandidates = candidates.map((set) => {
        const names = getIngredientNamesBySetId(set.set_id);
        const score = names.filter((name) =>
          selectedIngredientNames.has(name)
        ).length;

        return { set, score };
      });

      scoredCandidates.sort((a, b) => b.score - a.score);

      const bestScore = scoredCandidates[0].score;
      const bestCandidates = scoredCandidates.filter(
        (candidate) => candidate.score === bestScore
      );

      const picked =
        bestCandidates[Math.floor(Math.random() * bestCandidates.length)].set;

      resultIds.push(picked.set_id);

      getIngredientNamesBySetId(picked.set_id).forEach((name) =>
        selectedIngredientNames.add(name)
      );
    }

    setSelectedSetIds(resultIds);
  };

  const clearShoppingSets = () => {
    setSelectedSetIds([]);
  };

  const selectedShoppingSets = sets.filter((set) =>
    selectedSetIds.includes(set.set_id)
  );

  const shoppingIngredients = groupIngredients(
    selectedShoppingSets.flatMap((set) => {
      const targetDishes = getDishesBySet(set.set_id);
      const dishIds = targetDishes.map((dish) => dish.dish_id);

      return ingredients.filter((ingredient) =>
        dishIds.includes(ingredient.dish_id)
      );
    })
  );

  const shoppingIngredientGroups =
    groupIngredientsByCategory(shoppingIngredients);

  if (page === "detail" && selectedSet) {
    const selectedDishes = getDishesBySet(selectedSet.set_id);
    const selectedIngredients = getIngredientsByDishes(selectedDishes);
    const selectedIngredientGroups =
      groupIngredientsByCategory(selectedIngredients);
    const selectedSteps = getStepsByDishes(selectedDishes);
    const selectedCategory = getCategory(selectedSet);

    return (
      <div className="app">
        <button className="back-button" onClick={backToHome}>
          ← 一覧に戻る
        </button>

        <section className="detail-top">
          <img src={`/${selectedSet.image_path}`} alt={selectedSet.set_name} />

          <div className="detail-summary">
            <p className="label">
              {categoryIcons[selectedCategory] || "🍽️"} {selectedCategory}
            </p>
            <h1>{selectedSet.set_name}</h1>
            <p className="subtitle">{selectedSet.description}</p>

            <div className="nutrition-row">
              <div>
                <strong>{selectedSet.total_calories}</strong>
                <span>kcal</span>
              </div>
              <div>
                <strong>{selectedSet.total_protein}g</strong>
                <span>たんぱく質</span>
              </div>
              <div>
                <strong>{selectedSet.total_fat}g</strong>
                <span>脂質</span>
              </div>
              <div>
                <strong>{selectedSet.total_carbs}g</strong>
                <span>炭水化物</span>
              </div>
            </div>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <p>CONTENTS</p>
            <h2>定食の中身</h2>
          </div>

          <div className="dish-grid">
            {selectedDishes.map((dish) => (
              <div className="dish-card" key={dish.dish_id}>
                <span>{dishTypeLabels[dish.setDishType] || "料理"}</span>
                <h3>{dish.dish_name}</h3>
                <p>{dish.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <p>INGREDIENTS</p>
            <h2>材料</h2>
          </div>

          {selectedIngredientGroups.map((group) => (
            <div className="ingredient-category-card" key={group.category}>
              <h3>
                {ingredientCategoryIcons[group.category] || "🛒"}{" "}
                {group.category}
              </h3>

              {group.items.map((ingredient, index) => (
                <div className="ingredient-row" key={index}>
                  <span>{ingredient.ingredient_name}</span>
                  <strong>
                    {ingredient.quantity}
                    {ingredient.unit}
                  </strong>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className="content-section">
          <div className="section-heading">
            <p>RECIPE</p>
            <h2>作り方</h2>
          </div>

          <div className="recipe-list">
            {selectedSteps.map((dishStep) => (
              <div className="recipe-card" key={dishStep.dishName}>
                <h3>{dishStep.dishName}</h3>

                {dishStep.steps.map((step) => (
                  <div
                    className="step-row"
                    key={`${dishStep.dishName}-${step.step_no}`}
                  >
                    <span>{step.step_no}</span>
                    <p>{step.instruction}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (page === "shopping") {
    return (
      <div className="app">
        <button className="back-button" onClick={backToHome}>
          ← ホームに戻る
        </button>

        <header className="hero">
          <p className="label">SHOPPING LIST</p>
          <h1>買い物リスト</h1>
          <p className="subtitle">
            食べたい定食を選ぶと、必要な材料をまとめて表示します。
          </p>
        </header>

        <section className="shopping-panel">
          <label className="days-label">
            何日分？
            <input
              type="number"
              min="1"
              value={shoppingDays}
              onChange={(event) => setShoppingDays(event.target.value)}
            />
          </label>

          <div className="shopping-actions">
            <button className="primary-button" onClick={autoSelectSets}>
              おまかせで選ぶ
            </button>
            <button className="secondary-button" onClick={clearShoppingSets}>
              リセット
            </button>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <p>SELECT MENU</p>
            <h2>食べたい定食</h2>
          </div>

          <div className="shopping-set-list">
            {sets.map((set) => {
              const checked = selectedSetIds.includes(set.set_id);
              const setCategory = getCategory(set);

              return (
                <button
                  className={
                    checked
                      ? "shopping-set-card selected"
                      : "shopping-set-card"
                  }
                  key={set.set_id}
                  onClick={() => toggleShoppingSet(set.set_id)}
                >
                  <img src={`/${set.image_path}`} alt={set.set_name} />
                  <div>
                    <p>
                      {categoryIcons[setCategory] || "🍽️"} {setCategory}
                    </p>
                    <h3>{set.set_name}</h3>
                  </div>
                  <span>{checked ? "✓" : "+"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <p>RESULT</p>
            <h2>買い物リスト</h2>
          </div>

          {selectedShoppingSets.length === 0 ? (
            <div className="empty-card">
              食べたい定食を選ぶか、「おまかせで選ぶ」を押してね。
            </div>
          ) : (
            <>
              <div className="selected-menu-card">
                {selectedShoppingSets.map((set) => (
                  <span key={set.set_id}>{set.set_name}</span>
                ))}
              </div>

              {shoppingIngredientGroups.map((group) => (
                <div className="ingredient-category-card" key={group.category}>
                  <h3>
                    {ingredientCategoryIcons[group.category] || "🛒"}{" "}
                    {group.category}
                  </h3>

                  {group.items.map((ingredient, index) => (
                    <label className="ingredient-check-row" key={index}>
                      <input type="checkbox" />
                      <span>{ingredient.ingredient_name}</span>
                      <strong>
                        {ingredient.quantity}
                        {ingredient.unit}
                      </strong>
                    </label>
                  ))}
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="label">TODAY'S MENU</p>
        <h1>ごはん日和</h1>
        <p className="subtitle">
          気分に合わせて選べる、やさしい自炊の定食メモ。
        </p>
      </header>

      <div className="home-actions">
        <button className="primary-button" onClick={openShopping}>
          買い物リストを作る
        </button>
      </div>

      <main>
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              className={
                activeCategory === category
                  ? "category-tab active"
                  : "category-tab"
              }
              onClick={() => setActiveCategory(category)}
            >
              <span>
                {category === "すべて" ? "🌷" : categoryIcons[category]}
              </span>
              {category}
            </button>
          ))}
        </div>

        <div className="section-heading">
          <p>MENU LIST</p>
          <h2>{activeCategory}の定食</h2>
        </div>

        <div className="set-grid">
          {displayedSets.map((set) => {
            const setCategory = getCategory(set);

            return (
              <button
                className="set-card"
                key={set.set_id}
                onClick={() => openSetDetail(set)}
              >
                <img src={`/${set.image_path}`} alt={set.set_name} />

                <div className="set-card-body">
                  <p className="card-category">
                    {categoryIcons[setCategory] || "🍽️"} {setCategory}
                  </p>
                  <h3>{set.set_name}</h3>
                  <p className="card-description">{set.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default App;