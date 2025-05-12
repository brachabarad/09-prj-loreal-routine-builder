/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Store selected products
let selectedProducts = [];

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" 
         data-id="${product.id}" 
         data-name="${product.name}"
         data-brand="${product.brand}"
         data-image="${product.image}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add click handlers to all product cards
  addProductCardListeners();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Handle product card clicks */
function addProductCardListeners() {
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Toggle selected class
      card.classList.toggle("selected");

      // Get product data from card attributes
      const product = {
        id: card.dataset.id,
        name: card.dataset.name,
        brand: card.dataset.brand,
        image: card.dataset.image,
      };

      // Update selected products array
      if (card.classList.contains("selected")) {
        selectedProducts.push(product);
      } else {
        selectedProducts = selectedProducts.filter((p) => p.id !== product.id);
      }

      // Update selected products display
      updateSelectedProductsList();
    });
  });
}

/* Update the selected products list display */
function updateSelectedProductsList() {
  const selectedProductsList = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "<p>No products selected</p>";
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product-item">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <strong>${product.name}</strong>
        <p>${product.brand}</p>
      </div>
      <button class="remove-btn" data-id="${product.id}">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>
  `
    )
    .join("");

  // Add listeners for remove buttons
  addRemoveButtonListeners();
}

/* Handle remove button clicks */
function addRemoveButtonListeners() {
  const removeButtons = document.querySelectorAll(".remove-btn");

  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event bubbling
      const productId = button.dataset.id;

      // Remove from selected products array
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);

      // Remove selected class from product card
      const productCard = document.querySelector(
        `.product-card[data-id="${productId}"]`
      );
      if (productCard) {
        productCard.classList.remove("selected");
      }

      // Update display
      updateSelectedProductsList();
    });
  });
}

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

/* Get reference to generate button */
const generateButton = document.getElementById("generateRoutine");

/* Add these variables at the top with other variables */
let conversationHistory = [];
let currentRoutine = "";

/* Add this function after other function declarations */
/* Add a message to chat and scroll to bottom */
function addChatMessage(message, isError = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message${isError ? " error" : ""}`;
  messageDiv.innerHTML = message;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Update the chat form HTML in index.html */
chatForm.innerHTML = `
  <input type="text" 
         id="userInput" 
         placeholder="Ask a question about your routine..." 
         required>
  <button type="submit">
    <i class="fa-solid fa-paper-plane"></i>
  </button>
`;

/* Update the generate button click handler */
generateButton.addEventListener("click", async () => {
  // Check if products are selected
  if (selectedProducts.length === 0) {
    addChatMessage("Please select some products first to generate a routine.");
    return;
  }

  // Show loading state
  addChatMessage(
    '<i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...'
  );

  try {
    const prompt = `Create a skincare/beauty routine using these products:
      ${selectedProducts
        .map(
          (product) =>
            `- ${product.name} (${product.brand}): ${product.description}`
        )
        .join("\n")}
      
      Please provide a step-by-step routine that explains:
      1. The order to use these products
      2. When to use each product (morning/evening)
      3. How to apply each product
      4. Any special instructions or precautions
      
      Format the response in clear, numbered steps.`;

    const response = await fetch(OPENAI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a professional beauty advisor helping create personalized skincare and beauty routines.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    // Remove loading message
    chatWindow.lastChild.remove();

    if (data.choices && data.choices[0]) {
      const routine = data.choices[0].message.content;
      currentRoutine = routine; // Save routine for context

      // Display routine
      addChatMessage(
        `<strong>Your Personalized Routine:</strong><br><br>${routine.replace(
          /\n/g,
          "<br>"
        )}`
      );

      // Add to conversation history
      conversationHistory = [`Assistant: Here is your routine: ${routine}`];
    } else {
      throw new Error("No response from API");
    }
  } catch (error) {
    console.error("Error:", error);
    addChatMessage(
      "Sorry, there was an error generating your routine. Please try again.",
      true
    );
  }
});

/* Handle chat form submissions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput").value;

  // Check if question is beauty-related
  if (!isBeautyRelatedQuestion(userInput)) {
    addChatMessage(
      "Sorry, I only have knoledge regarding beauty routine, skincare, haircare, makeup, or other beauty-related topics.",
      true
    );
    return;
  }

  const userMessage = `<strong>You:</strong> ${userInput}`;
  addChatMessage(userMessage);
  document.getElementById("userInput").value = "";
  addChatMessage('<i class="fa-solid fa-spinner fa-spin"></i> Thinking...');

  try {
    // Create beauty-focused prompt
    const prompt = `Previous conversation about beauty routine: 
      ${conversationHistory.join("\n")}

      User question: ${userInput}
      
      Current beauty routine context: ${currentRoutine}
      
      Please provide expert beauty advice focusing only on:
      - The generated skincare/beauty routine
      - Product usage and application
      - Skincare concerns and solutions
      - Haircare tips and techniques
      - Makeup application and tips
      - Beauty product recommendations
      
      Keep responses focused on beauty and personal care topics only.`;

    const response = await fetch(OPENAI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a professional beauty advisor. Only provide advice about beauty, skincare, haircare, makeup and related topics. If asked about unrelated topics, politely redirect to beauty discussions.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    chatWindow.lastChild.remove(); // Remove loading

    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;
      addChatMessage(`<strong>Beauty Advisor:</strong> ${aiResponse}`);

      // Update conversation history (keep last 4 messages)
      conversationHistory.push(`User: ${userInput}`);
      conversationHistory.push(`Assistant: ${aiResponse}`);
      if (conversationHistory.length > 4) {
        conversationHistory = conversationHistory.slice(-4);
      }
    } else {
      throw new Error("Invalid API response");
    }
  } catch (error) {
    console.error("Chat Error:", error);
    chatWindow.lastChild.remove();
    addChatMessage(
      "Sorry, I couldn't process your question. Please try again.",
      true
    );
  }
});

/* Helper function to check if question is beauty-related */
function isBeautyRelatedQuestion(question) {
  // List of beauty-related keywords
  const beautyKeywords = [
    "skin",
    "hair",
    "makeup",
    "routine",
    "beauty",
    "product",
    "cleanser",
    "moisturizer",
    "serum",
    "cream",
    "lotion",
    "treatment",
    "face",
    "body",
    "apply",
    "use",
    "morning",
    "night",
    "spf",
    "sunscreen",
    "dry",
    "oily",
    "sensitive",
    "acne",
    "aging",
    "wrinkle",
    "pore",
    "tone",
    "texture",
    "fragrance",
    "perfume",
    "styling",
    "color",
    "dye",
    "care",
    "hydration",
    "exfoliate",
    "mask",
    "powder",
    "foundation",
    "lipstick",
    "mascara",
    "eyeshadow",
    "shampoo",
    "conditioner",
  ];

  // Convert question to lowercase for case-insensitive matching
  const lowercaseQuestion = question.toLowerCase();

  // Check if question contains any beauty-related keywords
  return beautyKeywords.some((keyword) => lowercaseQuestion.includes(keyword));
}
