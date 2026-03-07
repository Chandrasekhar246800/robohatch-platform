import { Request, Response } from "express";
import { runPrusaSlicer } from "../services/prusaSlicer.service";

export async function sliceModel(req: Request, res: Response) {

  try {

    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: "filePath is required"
      });
    }

    const result = await runPrusaSlicer(filePath);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Slicing failed"
    });

  }

}
