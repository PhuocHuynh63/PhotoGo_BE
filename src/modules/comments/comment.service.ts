import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentDto } from './dto/find-comment.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  //#region create
  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const comment = this.commentRepository.create(createCommentDto);
    return this.commentRepository.save(comment);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindCommentDto): Promise<{
    data: Comment[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Filter
    const queryBuilder = this.commentRepository.createQueryBuilder('comment');

    queryBuilder.leftJoinAndSelect('comment.user', 'user');
    queryBuilder.leftJoinAndSelect('comment.vendor', 'vendor');

    if (query.term) {
      queryBuilder.andWhere(
        '(comment.content ILIKE :term)',
        { term: `%${query.term}%` },
      );
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['created_at', 'updated_at'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`comment.${sortField}`, sortDirection);
    //#endregion

    //#region Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
  //#endregion findAll

  //#region findOne
  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user', 'vendor'],
    });
    if (!comment) {
      throw new NotFoundException(`Bình luận với id ${id} không tồn tại`);
    }
    return comment;
  }
  //#endregion findOne
}