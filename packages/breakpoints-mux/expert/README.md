# Expert Profile System

This directory contains expert profile definitions used by the `ExpertMatcher` to route questions to the most relevant domain experts.

## Schema

Each profile is a JSON file that conforms to the `ExpertProfile` Zod schema defined in `@a5c-ai/breakpoints-mux`. The JSON Schema equivalent is provided in `schema.json`.

### Required Fields

| Field             | Type                | Description                                                       |
|-------------------|---------------------|-------------------------------------------------------------------|
| `id`              | `string` (min 1)    | Unique identifier for the expert (e.g., `"frontend-expert"`)      |
| `name`            | `string` (min 1)    | Display name of the expert                                        |
| `title`           | `string`            | Professional title or role                                        |
| `expertiseAreas`  | `ExpertiseArea[]`   | Array of expertise domains (see below)                            |
| `availability`    | `boolean`           | Whether the expert is currently available for questions            |
| `responseTimeSla` | `number` (positive) | Maximum expected response time in milliseconds                    |

### Optional Fields

| Field           | Type                          | Description                                  |
|-----------------|-------------------------------|----------------------------------------------|
| `sessionConfig` | `Record<string, unknown>`     | Arbitrary configuration for expert sessions  |

### ExpertiseArea

Each entry in the `expertiseAreas` array has the following fields:

| Field         | Type              | Description                                          |
|---------------|-------------------|------------------------------------------------------|
| `domain`      | `string` (min 1)  | High-level domain (e.g., `"frontend"`, `"backend"`)  |
| `topics`      | `string[]`        | Specific technologies or subjects within the domain  |
| `keywords`    | `string[]`        | Search keywords used for matching questions          |
| `proficiency` | `integer` (1-5)   | Self-assessed proficiency level in this domain       |

## How to Create a Profile

1. Create a new `.json` file in the `.a5c/expert/` directory.
2. Use the expert's role or identifier as the filename (e.g., `frontend-expert.json`).
3. Fill in all required fields matching the schema above.
4. Validate the profile using the `ProfileValidator` from `@a5c-ai/breakpoints-mux`.

## Matching Algorithm

The `ExpertMatcher` scores experts against incoming questions using:

- **+3** per domain keyword match
- **+2** per topic match
- **+1** per keyword match
- Each area score is multiplied by the expert's `proficiency` (1-5)
- Experts with `availability: false` are excluded

## Example Profile

```json
{
  "id": "frontend-expert",
  "name": "Alex Chen",
  "title": "Senior Frontend Engineer",
  "expertiseAreas": [
    {
      "domain": "frontend",
      "topics": ["React", "TypeScript", "CSS", "accessibility", "performance"],
      "keywords": ["component", "UI", "UX", "responsive", "animation"],
      "proficiency": 5
    }
  ],
  "availability": true,
  "responseTimeSla": 1800000,
  "sessionConfig": {
    "timezone": "America/Los_Angeles",
    "schedule": "weekdays 9-17",
    "maxConcurrentQuestions": 3
  }
}
```
