import { Controller, route, http } from '@dazejs/framework';

@route()
export default class extends Controller {
  @http.get()
  index() {
    return { name: 'dazejs' };
  }
}