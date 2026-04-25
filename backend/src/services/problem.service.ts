import pool from "../config/db";

export const createProblem = async (
  roomId: string,
  data: {
    title: string;
    description: string;
    input_format?: string;
    output_format?: string;
    constraints?: string;
    points?: number;
    time_limit?: number;
    memory_limit?: number;
  },
) => {
  // get next order index
  const countResult = await pool.query(
    "SELECT COUNT(*) FROM problems WHERE room_id = $1",
    [roomId],
  );
  const orderIndex = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `INSERT INTO problems
      (room_id, title, description, input_format, output_format, constraints, points, time_limit, memory_limit, order_index)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      roomId,
      data.title,
      data.description,
      data.input_format || null,
      data.output_format || null,
      data.constraints || null,
      data.points ?? 100,
      data.time_limit ?? 2,
      data.memory_limit ?? 256,
      orderIndex,
    ],
  );
  return result.rows[0];
};

export const getProblems = async (roomId: string) => {
  const result = await pool.query(
    `SELECT p.*, 
       json_agg(
         json_build_object(
           'id', tc.id,
           'input', tc.input,
           'expected_output', tc.expected_output,
           'is_sample', tc.is_sample,
           'order_index', tc.order_index
         ) ORDER BY tc.order_index
       ) FILTER (WHERE tc.id IS NOT NULL) as test_cases
     FROM problems p
     LEFT JOIN test_cases tc ON tc.problem_id = p.id
     WHERE p.room_id = $1
     GROUP BY p.id
     ORDER BY p.order_index`,
    [roomId],
  );
  return result.rows;
};

export const getProblemById = async (problemId: string) => {
  const result = await pool.query(
    `SELECT p.*,
       json_agg(
         json_build_object(
           'id', tc.id,
           'input', tc.input,
           'expected_output', tc.expected_output,
           'is_sample', tc.is_sample,
           'order_index', tc.order_index
         ) ORDER BY tc.order_index
       ) FILTER (WHERE tc.id IS NOT NULL) as test_cases
     FROM problems p
     LEFT JOIN test_cases tc ON tc.problem_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [problemId],
  );
  if (!result.rows[0]) throw new Error("Problem not found");
  return result.rows[0];
};

export const updateProblem = async (
  problemId: string,
  data: {
    title?: string;
    description?: string;
    input_format?: string;
    output_format?: string;
    constraints?: string;
    points?: number;
    time_limit?: number;
    memory_limit?: number;
  },
) => {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${i++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${i++}`);
    values.push(data.description);
  }
  if (data.input_format !== undefined) {
    fields.push(`input_format = $${i++}`);
    values.push(data.input_format);
  }
  if (data.output_format !== undefined) {
    fields.push(`output_format = $${i++}`);
    values.push(data.output_format);
  }
  if (data.constraints !== undefined) {
    fields.push(`constraints = $${i++}`);
    values.push(data.constraints);
  }
  if (data.points !== undefined) {
    fields.push(`points = $${i++}`);
    values.push(data.points);
  }
  if (data.time_limit !== undefined) {
    fields.push(`time_limit = $${i++}`);
    values.push(data.time_limit);
  }
  if (data.memory_limit !== undefined) {
    fields.push(`memory_limit = $${i++}`);
    values.push(data.memory_limit);
  }

  if (fields.length === 0) throw new Error("Nothing to update");

  values.push(problemId);
  const result = await pool.query(
    `UPDATE problems SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (!result.rows[0]) throw new Error("Problem not found");
  return result.rows[0];
};

export const deleteProblem = async (problemId: string) => {
  const result = await pool.query(
    "DELETE FROM problems WHERE id = $1 RETURNING id",
    [problemId],
  );
  if (!result.rows[0]) throw new Error("Problem not found");
};

export const addTestCase = async (
  problemId: string,
  input: string,
  expectedOutput: string,
  isSample: boolean,
) => {
  const countResult = await pool.query(
    "SELECT COUNT(*) FROM test_cases WHERE problem_id = $1",
    [problemId],
  );
  const orderIndex = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, order_index)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [problemId, input, expectedOutput, isSample, orderIndex],
  );
  return result.rows[0];
};

export const deleteTestCase = async (testCaseId: string) => {
  const result = await pool.query(
    "DELETE FROM test_cases WHERE id = $1 RETURNING id",
    [testCaseId],
  );
  if (!result.rows[0]) throw new Error("Test case not found");
};

export const getPublicProblems = async (roomId: string) => {
  // for participants — hidden test cases are excluded from response
  const problems = await getProblems(roomId);
  return problems.map((p) => ({
    ...p,
    test_cases: (p.test_cases || []).filter((tc: any) => tc.is_sample),
  }));
};
