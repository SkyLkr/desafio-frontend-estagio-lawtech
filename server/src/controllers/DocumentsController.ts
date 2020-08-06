import { Request, Response } from 'express';
import { getConnection } from 'typeorm';

import { User } from '../entity/User';
import { Document } from '../entity/Document';

interface AuthenticatedRequest extends Request {
  userId: number;
}

export default class DocumentsController {
  async index(request: AuthenticatedRequest, response: Response) {
    const connection = getConnection();
    const userRepository = connection.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: request.userId },
      select: ['id', 'email'],
      relations: ['documents'],
    });

    return response.json(user);
  }

  async detail(request: AuthenticatedRequest, response: Response) {
    const { id: documentId } = request.params;

    const connection = getConnection();
    const userRepository = connection.getRepository(User);
    const documentRepository = connection.getRepository(Document);

    const user = await userRepository.findOne(request.userId);
    const document = await documentRepository.findOne({
      where: { id: documentId },
      relations: ['owner'],
    });

    if (document.owner.id !== user.id) {
      return response.status(401).json({ error: 'Not authorized' });
    }

    const serializedFile = {
      name: document.name,
      downloadLink: `http://localhost:3333/uploads/${document.filePath}`,
    };

    return response.json(serializedFile);
  }

  async create(request: AuthenticatedRequest, response: Response) {
    const { name } = request.body;
    const file = request.file;

    const connection = getConnection();
    const userRepository = connection.getRepository(User);
    const documentRepository = connection.getRepository(Document);

    const user = await userRepository.findOne(request.userId);

    if (!user) {
      return response.status(401).json({ error: 'User not authenticated' });
    }

    const document = documentRepository.create({
      name,
      filePath: file.filename,
      owner: user,
    });

    await documentRepository.save(document);

    return response.status(201).send();
  }
}