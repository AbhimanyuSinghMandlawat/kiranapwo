import { renderLayout } from "../components/Layout";
import { getAllSales } from "../services/db";
import { calculateCreditScore } from "../services/creditScore";

export async function renderCreditScore(container) {
  const sales = await getAllSales();
  const score = calculateCreditScore(sales);

  let level = "Poor";
  if (score > 750) level = "Excellent";
  else if (score > 650) level = "Good";
  else if (score > 550) level = "Average";

  const content = `
    <section class="credit-score">
      <h1>Business Credit Score</h1>

      <div class="score-box">
        <h2>${score}</h2>
        <p>${level}</p>
      </div>

      <p class="score-info">
        This score is calculated based on your sales performance,
        consistency, and credit usage.
      </p>
    </section>
  `;

  container.innerHTML = renderLayout(content);
}
