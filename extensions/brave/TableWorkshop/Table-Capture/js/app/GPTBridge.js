const _TC_GPT_OPEN_API_URL = "https://api.openai.com/v1/completions";

class GPTBridge {
  constructor(gptApiKey) {
    this.gptApiKey_ = gptApiKey;
  }

  applyPromptToData(
    prompt,
    data,
    expectedFirstRow,
    promptDataGenerator = null,
    max = 1,
    startingIndex = 0
  ) {
    if (!prompt.includes("$")) {
      return Promise.reject(
        new Error("Temporary limitation: Prompts must operate on a column.")
      );
    }

    // TODO(gmike): Consider figuring out max column lengths.
    // const columnIndexes = (prompt.match(/\$[0-9]+/g) ?? [])
    //    .forEach(placeholder => parseInt(placeholder.substring(1), 10) - 1);

    // V1 Params
    const modelParams = {
      model: "text-davinci-002",
      temperature: 0.7,
      max_tokens: expectedFirstRow.length * 3,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };

    const requestOptionsBase = {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.gptApiKey_}`,
      },
    };

    if (!promptDataGenerator) {
      promptDataGenerator = (prompt, data, index) => {
        const placeholders = prompt.match(/\$[0-9]+/g);

        if (placeholders) {
          let fullPrompt = prompt;
          placeholders.forEach((placeholder) => {
            const column = parseInt(placeholder.substring(1), 10) - 1;
            fullPrompt = fullPrompt.replace(
              placeholder,
              `the text: \`${data[index][column]}\``
            );
          });
          return fullPrompt;
        }
        const text = data[index].join("\t");
        return `${prompt} in the following text: ` + text;
      };
    }

    // NOTE(gmike): The X is just a character.
    return Promise.all(
      "X"
        .repeat(max)
        .split("")
        .map((_, i) => {
          const effectiveIndex = i + startingIndex;

          if (_TCAP_CONFIG.gptMockResponses) {
            return Promise.resolve({
              index: effectiveIndex,
              values: [Math.random().toString(36).slice(2)],
            });
          }

          const fullPrompt = promptDataGenerator(prompt, data, effectiveIndex);
          const body = JSON.stringify({
            ...modelParams,
            prompt: fullPrompt,
          });
          const requestOptions = { ...requestOptionsBase, body };

          return fetch(_TC_GPT_OPEN_API_URL, requestOptions)
            .then((response) => {
              if (response.ok) {
                return response.json();
              }
              throw new Error("Network response was not ok.");
            })
            .then((response) =>
              this.processTableResponse_(response, effectiveIndex, data)
            );
        })
    );
  }

  processTableResponse_(response, index, data) {
    const tokensUsed =
      response && response.usage ? response.usage.total_tokens : 0;
    const baseProcessedResponse = {
      index,
      values: [],
      tokensUsed,
    };

    if (response && response.choices) {
      const values = response.choices.map((c) => c.text.trim());
      return { ...baseProcessedResponse, values };
    }
    return { ...baseProcessedResponse };
  }
}
