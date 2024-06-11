chrome.runtime.onInstalled.addListener(() => {
  chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
      if (details.url.includes("beacon.searchspring.io")) {
        const requestBody = getRequestBody(details);
        checkRequest(details, requestBody);
      }
    },
    { urls: ["<all_urls>"], types: ["xmlhttprequest"] },
    ["requestBody"]
  );
});

function getRequestBody(details) {
  const raw = details.requestBody?.raw?.[0]?.bytes;
  if (!raw) return {};
  const decodedString = decodeURIComponent(
    escape(String.fromCharCode.apply(null, new Uint8Array(raw)))
  );
  return JSON.parse(decodedString);
}

function checkRequest(details, requestBody) {
  const expectedStructures = {
    "profile.render": {
      category: "string",
      context: {
        userId: "string", // Changed to string based on provided data
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      event: {
        context: {
          type: "string",
          tag: "string",
          placement: "string",
        },
        profile: {
          tag: "string",
          placement: "string",
          threshold: "number", // Added based on provided data
          templateId: "string", // Added based on provided data
          seed: "array", // Added based on provided data
        },
      },
      id: "string",
      type: "string",
    },
    "profile.impression": {
      category: "string",
      context: {
        userId: "string",
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      event: {
        context: {
          type: "string",
          tag: "string",
          placement: "string",
        },
        profile: {
          tag: "string",
          placement: "string",
        },
      },
      id: "string",
      type: "string",
    },
    "profile.click": {
      category: "string",
      context: {
        userId: "string",
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      event: {
        context: {
          type: "string",
          tag: "string",
          placement: "string",
        },
        profile: {
          tag: "string",
          placement: "string",
          seed: "string",
        },
      },
      id: "string",
      type: "string",
    },
    "profile.product.render": {
      category: "string",
      context: {
        userId: "string",
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      event: {
        context: {
          placement: "string",
          tag: "string",
          type: "string",
        },
        product: {
          id: "string",
          mappings: "object",
          seed: "array",
        },
      },
      id: "string",
      pid: "string",
    },
    "profile.product.impression": {
      category: "string",
      context: {
        userId: "string",
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      event: {
        context: {
          placement: "string",
          tag: "string",
          type: "string",
        },
        product: {
          id: "string",
          mappings: "object", // Only check that mappings exists
        },
      },
      id: "string",
      pid: "string",
    },
    "profile.product.click": {
      category: "string",
      context: {
        userId: "string",
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      id: "string",
      pid: "string",
      type: "string",
      event: {
        context: {
          type: "string",
          tag: "string",
          placement: "string",
        },
        profile: {
          tag: "string",
          placement: "string",
        },
        product: {
          id: "string",
          mappings: "object",
        },
      },
    },
    "product": {
      category: "string",
      context: {
        userId: "string",
        legacyUserId: "string",
        sessionId: "string",
        website: {
          trackingCode: "string",
        },
      },
      event: {
        sku: "string",
      },
      id: "string",
      pid: "object", // null is considered an object in JavaScript
    },
  };

  try {
    if (Array.isArray(requestBody)) {
      requestBody.forEach((body) =>
        validateAndLog(details, body, expectedStructures)
      );
    } else {
      validateAndLog(details, requestBody, expectedStructures);
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
  }
}

function validateAndLog(details, body, expectedStructures) {
  if (!body.type) {
    console.error("Request type is undefined or missing:", body);
    return;
  }
  const structure = expectedStructures[body.type];
  if (!structure) {
    console.error(`No expected structure found for type: ${body.type}`, body);
    return;
  }

  const validationResult = validateStructure(body, structure);
  if (validationResult.isValid) {
    console.log(`Request structure is valid for type: ${body.type}`, body);
  } else {
    console.log(`Request structure is invalid for type: ${body.type}`);
    console.log(`Validation errors:`, validationResult.errors);
    console.log(`Actual request body:`, body);
  }
}

function validateStructure(request, structure, path = "") {
  const errors = [];
  if (Array.isArray(structure)) {
    if (!Array.isArray(request)) {
      errors.push(`${path} expected array, got ${typeof request}`);
    } else {
      request.forEach((item, index) => {
        const result = validateStructure(
          item,
          structure[0],
          `${path}[${index}]`
        );
        errors.push(...result.errors);
      });
    }
  } else if (typeof structure === "string") {
    if (structure === "array") {
      if (!Array.isArray(request)) {
        errors.push(`${path} expected array, got ${typeof request}`);
      }
    } else if (typeof request !== structure) {
      errors.push(`${path} expected ${structure}, got ${typeof request}`);
    }
  } else {
    for (let key in structure) {
      const newPath = path ? `${path}.${key}` : key;
      if (
        typeof structure[key] === "object" &&
        structure[key] !== null &&
        !Array.isArray(structure[key])
      ) {
        if (!request[key]) {
          errors.push(`${newPath} is missing`);
        } else {
          const result = validateStructure(
            request[key],
            structure[key],
            newPath
          );
          errors.push(...result.errors);
        }
      } else {
        const result = validateStructure(request[key], structure[key], newPath);
        errors.push(...result.errors);
      }
    }
  }
  return { isValid: errors.length === 0, errors: errors };
}
